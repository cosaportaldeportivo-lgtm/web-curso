const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// --- INSTAGRAM (SEGUIDORES) ---
app.get('/api/instagram/:username', async (req, res) => {
    const username = req.params.username;
    let browser = null;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2', timeout: 30000 });
        const followers = await page.evaluate(() => {
            const items = document.querySelectorAll('header section ul li a');
            for (let link of items) {
                const span = link.querySelector('span');
                if (span) {
                    let text = span.innerText.trim();
                    if (/\d/.test(text) && !text.toLowerCase().includes('following') && !text.toLowerCase().includes('siguiendo')) {
                        if (link.getAttribute('title')) {
                            return link.getAttribute('title').replace(/[^0-9,.]/g, '');
                        }
                        return text.replace(/\s*[fF]ollow(ers|ing)\s*/g, '').trim();
                    }
                }
            }
            return 'No disponible';
        });
        await browser.close();
        res.json({ username, followers });
    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ Instagram error:", error.message);
        res.status(500).json({ error: 'Error al obtener seguidores de Instagram' });
    }
});

// --- TIKTOK (INTACTO - ESPERAR A QUE LA IP SE DESBLOQUEE) ---
app.get('/api/tiktok/:username', async (req, res) => {
    const username = req.params.username;
    let browser = null;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 3000));

        const followers = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const el = document.querySelector('[data-e2e="followers-count"]');
            if (el) {
                let text = el.innerText.trim();
                if (text.length > 0 && text.length < 10 && /\d/.test(text)) return text;
            }
            const match = bodyText.match(/([0-9,.]+[KkMm]?)\s*(?:seguidores|followers|follower|seguidor)/i);
            if (match && match[1]) return match[1].trim();
            const allNumbers = bodyText.match(/\b[0-9]{1,6}\b/g);
            if (allNumbers) return allNumbers[0];
            return 'No disponible';
        });
        await browser.close();
        res.json({ username, followers });
    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ TikTok error:", error.message);
        res.status(500).json({ error: 'Error al obtener seguidores de TikTok' });
    }
});

// --- PUBLICACIONES (NUEVO MÉTODO CON DOBLE FILTRO Y ESPERA AL FEED) ---
app.get('/api/instagram/posts/:username', async (req, res) => {
    const username = req.params.username;
    let browser = null;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2', timeout: 30000 });

        // Esperar a que aparezca el feed (un contenedor grid)
        await page.waitForSelector('div[role="grid"], div._aano', { timeout: 15000 });
        await page.evaluate(() => window.scrollBy(0, 600));
        await new Promise(r => setTimeout(r, 2500));

        const postsData = await page.evaluate(() => {
            // 1. Seleccionamos todos los artículos que están dentro del feed (fuera del header)
            const feedArticles = document.querySelectorAll('div[role="grid"] article, div._aano article, main article, article:not(header article)');
            let results = [];
            let seenSrcs = new Set();

            for (let article of feedArticles) {
                // 2. Buscamos el enlace de la publicación (debe tener /p/ o /reel/)
                const link = article.querySelector('a[href*="/p/"], a[href*="/reel/"]');
                if (!link) continue;

                // 3. Obtenemos la imagen
                const img = link.querySelector('img');
                if (!img) continue;

                const src = img.src;
                // 4. Filtramos imágenes de perfil o avatares
                if (!src || src.includes('profile') || src.includes('avatar') || seenSrcs.has(src)) continue;
                seenSrcs.add(src);

                // 5. Extraemos los datos del artículo
                const aria = article.getAttribute('aria-label') || '';
                const innerText = article.innerText || '';
                const textToSearch = aria || innerText;

                let likes = '0';
                let comments = '0';
                const likesMatch = textToSearch.match(/([0-9,.]+[KkMm]?)\s*(?:me gusta|like|likes)/i);
                if (likesMatch) likes = likesMatch[1].trim();
                const commentsMatch = textToSearch.match(/([0-9,.]+[KkMm]?)\s*(?:comentarios|comments|comment)/i);
                if (commentsMatch) comments = commentsMatch[1].trim();

                results.push({ src, likes, comments, href: link.href });
                if (results.length >= 6) break;
            }
            return results;
        });
        await browser.close();

        console.log(`✅ Encontré ${postsData.length} publicaciones reales en el feed.`);

        let photos = [], reels = [];
        for (let item of postsData) {
            const postData = { src: item.src, likes: item.likes, comments: item.comments };
            if (item.href && item.href.includes('/reel/')) {
                reels.push(postData);
            } else {
                photos.push(postData);
            }
        }

        res.json({ username, photos: photos.slice(0, 3), reels: reels.slice(0, 3) });
    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ Instagram Posts error:", error.message);
        res.json({ photos: [], reels: [] });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});