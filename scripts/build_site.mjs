import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('estimate-content.json', root), 'utf8'));
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const money = value => new Intl.NumberFormat('ru-RU').format(value) + '\u00a0₽';
const prices = data.prices;

// Суммы сверяем до публикации, чтобы клиент не видел противоречивые итоги.
const expectedTotals = {
  firstYearTotal: prices.development + prices.domainFirstYear + prices.hostingYear,
  renewalWithoutSupport: prices.domainRenewal + prices.hostingYear,
  renewalWithSupport: prices.domainRenewal + prices.hostingYear + prices.supportYear,
  adsStartMinimum: prices.adsSetup + prices.adsTestBudgetMinimum,
  siteAndAdsMinimum: prices.firstYearTotal + prices.adsSetup + prices.adsTestBudgetMinimum
};
for (const [key, expected] of Object.entries(expectedTotals)) {
  if (prices[key] !== expected) throw new Error(`Incorrect total: ${key}`);
}
for (const [items, expected] of [
  [data.payments.initial, [prices.development, prices.domainFirstYear, prices.hostingYear]],
  [data.payments.yearly, [prices.domainRenewal, prices.hostingYear, prices.supportYear]]
]) {
  if (items.some((item, index) => item.amount !== expected[index])) throw new Error('Payment rows differ from prices');
}

const replacements = {
  ...Object.fromEntries(Object.entries(prices).map(([key, value]) => [key, escapeHtml(money(value))])),
  externalFirstYear: escapeHtml(money(prices.domainFirstYear + prices.hostingYear)),
  // Готовую презентацию можно отправить одним HTML-файлом, включая иллюстрации.
  styles: readFileSync(new URL('dist/style.css', root), 'utf8'),
  script: readFileSync(new URL('dist/app.js', root), 'utf8'),
  illustrations: readFileSync(new URL('src/illustrations.svg', root), 'utf8')
};
const template = readFileSync(new URL('src/index.html', root), 'utf8');
const html = template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
  if (Object.hasOwn(replacements, key)) return replacements[key];
  const value = key.split('.').reduce((current, part) => current?.[part], data);
  if (typeof value !== 'string') throw new Error(`Unknown template value: ${key}`);
  return escapeHtml(value);
});
const destination = new URL('dist/index.html', root);
writeFileSync(destination, html);
console.log(`Built ${fileURLToPath(destination)}`);
