import { currencies, resolveCurrency, formatPrice, attribution, commerceUrl } from './commerce.mjs';
const config = JSON.parse(document.getElementById('site-config').textContent);
const read = (store,key) => {try { return window[store].getItem(key); } catch { return null; }};
const write = (store,key,value) => {try { window[store].setItem(key,value); } catch { /* Browsing remains fully functional with storage disabled. */ }};
const saved = read('localStorage','it.currency.v1');
let manualCurrency = currencies.includes(saved) ? saved : null;
let currency = resolveCurrency({manual:manualCurrency,fallback:config.commerce.defaultCurrency});
let consent = read('localStorage','it.consent.v1');
let initialized = false;
const production = config.analytics.productionHosts.includes(location.hostname);
let utms = attribution(location.search);
if (consent === 'granted') {
  try { if (!Object.keys(utms).length) utms = JSON.parse(read('sessionStorage','it.attribution.v1') || '{}'); } catch { utms = {}; }
}
const courseById = id => config.courses.find(c => c.id === id);
function dispatch(event,extra={}) {
  if (consent !== 'granted' || !production) return;
  const params = {currency,...extra,...utms};
  if (config.analytics.mode === 'gtm') window.dataLayer?.push({event,...params});
  else if (typeof window.gtag === 'function') window.gtag('event',event,params);
  if (config.analytics.metaPixelId && typeof window.fbq === 'function') window.fbq('trackCustom',event,params);
}
function appendScript(id,src) {
  if (document.getElementById(id) || [...document.scripts].some(s=>s.src===src)) return;
  const script = document.createElement('script'); script.id=id; script.src=src; script.async=true; document.head.append(script);
}
function setupAnalytics() {
  if (consent !== 'granted' || !production) return;
  write('sessionStorage','it.attribution.v1',JSON.stringify(utms));
  if (initialized) {
    window.gtag?.('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.fbq?.('consent','grant');
    return;
  }
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
  window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  if (config.analytics.mode === 'gtm' && /^GTM-[A-Z0-9]+$/.test(config.analytics.gtmId)) {
    window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
    appendScript('it-gtm','https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(config.analytics.gtmId));
  } else if (config.analytics.mode === 'ga4' && /^G-[A-Z0-9]+$/.test(config.analytics.ga4Id)) {
    window.gtag('js',new Date());
    window.gtag('config',config.analytics.ga4Id,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false});
    appendScript('it-ga4','https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.analytics.ga4Id));
  }
  if (/^\d+$/.test(config.analytics.metaPixelId)) {
    if (!window.fbq) {const fbq=function(){fbq.callMethod?fbq.callMethod.apply(fbq,arguments):fbq.queue.push(arguments);};fbq.queue=[];fbq.loaded=true;fbq.version='2.0';window.fbq=fbq;}
    window.fbq('consent','grant');window.fbq('init',config.analytics.metaPixelId);window.fbq('track','PageView');
    appendScript('it-meta','https://connect.facebook.net/en_US/fbevents.js');
  }
  observeCourses();
}
const seen = new Set();
function observeCourses() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries=>{
    for(const entry of entries) if(entry.isIntersecting && consent==='granted') {
      const id=entry.target.dataset.viewCourse;
      if (!seen.has(id)) {seen.add(id);const c=courseById(id);dispatch('view_item',{items:[{item_id:id,item_name:c.name,price:c.prices[currency]}]});}
      observer.unobserve(entry.target);
    }
  },{threshold:.35});
  document.querySelectorAll('[data-view-course]').forEach(el=>observer.observe(el));
}
function rewriteCommerceLinks() {
  document.querySelectorAll('a[data-course]').forEach(a=>{
    const c=courseById(a.dataset.course); if(c)a.href=commerceUrl(c.url,utms);
  });
}
function renderCurrency() {
  document.querySelectorAll('[data-currency]').forEach(s=>s.value=currency);
  document.querySelectorAll('[data-price]').forEach(el=>el.textContent=formatPrice(courseById(el.dataset.price).prices[currency],currency));
  document.querySelectorAll('.price-currency').forEach(el=>el.textContent=currency);
  document.querySelectorAll('[data-payment]').forEach(el=>el.textContent=config.commerce.payments[currency]);
  document.getElementById('currency-note').textContent=`Estás viendo precios en ${currency}. Al continuar en Tiendup, elegí ${currency==='ARS'?'Pesos argentinos':'Dólares estadounidenses'}.`;
  const selected=document.querySelector('input[name="goal"]:checked');if(selected)renderRecommendation(selected.value,false);
}
document.querySelectorAll('[data-currency]').forEach(select=>select.addEventListener('change',()=>{
  if (!currencies.includes(select.value)) return;
  manualCurrency=select.value; currency=manualCurrency;write('localStorage','it.currency.v1',currency);renderCurrency();dispatch('currency_select',{selected_currency:currency});
}));
async function detectCountry() {
  if(manualCurrency || !config.commerce.geoEndpoint) return;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),config.commerce.geoTimeoutMs);
  try {
    const response=await fetch(config.commerce.geoEndpoint,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)return;const data=await response.json();
    if(data.success!==false && /^[A-Z]{2}$/.test(data.country_code||'')) {
      // Re-read manual preference after the asynchronous lookup: it always wins.
      currency=resolveCurrency({manual:manualCurrency,country:data.country_code,fallback:config.commerce.defaultCurrency});renderCurrency();
    }
  } catch { /* Network failure keeps the explicit default and manual selector. */ }
  finally {clearTimeout(timer);}
}
function renderRecommendation(id,track=true) {
  const c=courseById(id);if(!c)return;
  const target=document.getElementById('recommendation');target.replaceChildren();
  const label=document.createElement('p');label.textContent='TU CAMINO RECOMENDADO';label.className='eyebrow';
  const title=document.createElement('h3');title.textContent=c.name;
  const info=document.createElement('p');info.textContent=c.audience+' '+formatPrice(c.prices[currency],currency)+'.';
  const a=document.createElement('a');a.href=commerceUrl(c.url,utms);a.className='button';a.textContent=c.cta+' ↗';a.dataset.course=id;a.dataset.event='buy_click';
  target.append(label,title,info,a);if(track)dispatch('recommendation_select',{item_id:id});
}
document.querySelectorAll('input[name="goal"]').forEach(input=>input.addEventListener('change',()=>renderRecommendation(input.value)));
document.addEventListener('click',event=>{
  const a=event.target.closest('a[data-event]');if(!a)return;
  const c=courseById(a.dataset.course);dispatch(a.dataset.event,c?{item_id:c.id,items:[{item_id:c.id,item_name:c.name,price:c.prices[currency]}]}:{});
});
const menu=document.getElementById('mobile-menu');const menuButton=document.querySelector('.menu-button');
menuButton.addEventListener('click',()=>{const expanded=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!expanded));menu.hidden=expanded;});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.focus();}});
const dialog=document.getElementById('lightbox');let opener=null;
document.querySelectorAll('[data-lightbox]').forEach(a=>a.addEventListener('click',event=>{
  if(typeof dialog.showModal!=='function')return;event.preventDefault();opener=a;
  const img=dialog.querySelector('img');img.src=a.href;img.alt=a.querySelector('img').alt;dialog.querySelector('p').textContent=a.dataset.caption;dialog.showModal();
}));
dialog.querySelector('button').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>opener?.focus());
const consentPanel=document.getElementById('consent');
document.getElementById('privacy-settings').addEventListener('click',()=>{consentPanel.hidden=false;consentPanel.querySelector('button').focus();});
document.querySelectorAll('[data-consent]').forEach(b=>b.addEventListener('click',()=>{
  consent=b.dataset.consent;write('localStorage','it.consent.v1',consent);consentPanel.hidden=true;
  if(consent==='granted')setupAnalytics();
  else {window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});window.fbq?.('consent','revoke');try{sessionStorage.removeItem('it.attribution.v1');}catch{}}
}));
// Optional resources remain absent until real, approved media are configured.
if(config.media.instructorVideo) {
  const u=new URL(config.media.instructorVideo,location.href);
  if(u.origin===location.origin || u.protocol==='https:') {const host=document.getElementById('instructor-video');const video=document.createElement('video');video.controls=true;video.preload='none';video.src=u.href;video.setAttribute('aria-label','Presentación de Ignacio Torchi');host.append(video);host.hidden=false;}
}
if(config.media.studentWork?.length) {
  const host=document.getElementById('student-work');
  const approved=config.media.studentWork.filter(x=>x.authorized===true&&x.src&&x.alt);
  if(approved.length){const h=document.createElement('h3');h.textContent='Trabajos de alumnos';host.append(h);for(const item of approved){const img=document.createElement('img');img.src=item.src;img.alt=item.alt;img.loading='lazy';host.append(img);}host.hidden=false;}
}
renderCurrency();rewriteCommerceLinks();detectCountry();setupAnalytics();
if(!['granted','denied'].includes(consent))consentPanel.hidden=false;
