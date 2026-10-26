export const currencies = ['ARS', 'USD'];
export async function lookupCountry(endpoint, timeoutMs=5000, fetcher=fetch) {
  if (Array.isArray(endpoint)) {
    for (const provider of endpoint) {
      const country = await lookupCountry(provider,timeoutMs,fetcher);
      if (country) return country;
    }
    return null;
  }
  if (!endpoint) return null;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const url = new URL(endpoint);
    url.searchParams.set('nocache',Date.now().toString());
    const response = await fetcher(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    if (!response.ok) return null;
    const data = await response.json();
    return data.success!==false && !data.error && /^[A-Z]{2}$/.test(data.country_code || '') ? data.country_code : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}
export function resolveCurrency({manual, country, fallback='USD'}) {
  if (currencies.includes(manual)) return manual;
  if (/^[A-Z]{2}$/.test(country || '')) return country === 'AR' ? 'ARS' : 'USD';
  return currencies.includes(fallback) ? fallback : 'USD';
}
export function formatPrice(value, currency) {
  if (!Number.isFinite(value) || value < 0 || !currencies.includes(currency)) throw new Error('Invalid commercial price');
  return (currency === 'ARS' ? 'AR$ ' : 'US$ ') + new Intl.NumberFormat('es-AR', {minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2}).format(value);
}
export function attribution(search) {
  const params = new URLSearchParams(search);
  const values = {};
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
    const value = params.get(key);
    if (value && value.length <= 120 && !/[@\r\n]/.test(value)) values[key] = value;
  }
  return values;
}
export function commerceUrl(base, utms={}) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.hostname !== 'ignaciotorchi.com') throw new Error('Invalid commercial destination');
  for (const [key,value] of Object.entries(utms)) if (key.startsWith('utm_')) url.searchParams.set(key,value);
  return url.href;
}
