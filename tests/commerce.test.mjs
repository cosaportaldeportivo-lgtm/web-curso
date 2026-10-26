import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveCurrency,formatPrice,attribution,commerceUrl} from '../commerce.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../site.config.json',import.meta.url),'utf8'));
test('manual preference wins over country and unavailable detection',()=>{
 assert.equal(resolveCurrency({manual:'USD',country:'AR'}),'USD');
 assert.equal(resolveCurrency({manual:'ARS',country:'US'}),'ARS');
 assert.equal(resolveCurrency({country:'AR'}),'ARS');
 assert.equal(resolveCurrency({country:'MX'}),'USD');
 assert.equal(resolveCurrency({country:null}),'USD');
 assert.equal(resolveCurrency({manual:'EUR',country:'AR'}),'ARS');
});
test('separate Tiendup amounts, no invented currency conversion',()=>{
 assert.equal(formatPrice(config.courses[0].prices.USD,'USD'),'US$ 31,00');
 assert.equal(formatPrice(config.courses[0].prices.ARS,'ARS'),'AR$ 31.050');
 assert.equal(formatPrice(config.courses[1].prices.USD,'USD'),'US$ 55,30');
 assert.equal(formatPrice(config.courses[2].prices.USD,'USD'),'US$ 35,60');
 assert.throws(()=>formatPrice(NaN,'USD'));
});
test('UTMs survive the commercial link without inventing checkout or currency params',()=>{
 const utms=attribution('?utm_source=instagram&utm_medium=stories&utm_campaign=octubre&utm_content=story_1&email=x@y.com&fbclid=private');
 const url=new URL(commerceUrl(config.courses[0].url,utms));
 assert.equal(url.searchParams.get('utm_source'),'instagram');
 assert.equal(url.searchParams.get('utm_medium'),'stories');
 assert.equal(url.pathname,'/curso/adobe-photoshop-desde-0');
 assert.equal(url.searchParams.has('email'),false);
 assert.equal(url.searchParams.has('currency'),false);
 assert.equal(url.searchParams.has('fbclid'),false);
 assert.throws(()=>commerceUrl('https://example.com'));
});
test('generated HTML contains real fallback content, valid anchors and no fake scarcity',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const c of config.courses){assert.ok(html.includes(c.url));assert.ok(html.includes(c.name));}
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
 assert.ok(!html.includes('500+'));
 assert.ok(!html.includes('3 cuotas sin interés'));
 assert.ok(!html.includes('OFERTA POR TIEMPO LIMITADO'));
 for(const q of config.testimonials)assert.ok(html.includes(q.quote));
 assert.equal(fs.readFileSync(new URL('../CNAME',import.meta.url),'utf8').trim(),'cursos.ignaciotorchi.com');
});
