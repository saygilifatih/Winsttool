const $ = id => document.getElementById(id);
const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const decimal = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const read = id => Math.max(0, Number.parseFloat($(id).value.replace(',', '.')) || 0);
const bolIds = ['fixedCommission','commissionRate','bolFulfilment','shipping','bolOther'];
const shopIds = ['ads','rent','shopOther','shopFulfilment'];
const defaults = { fixedCommission:'1', commissionRate:'15', bolFulfilment:'', shipping:'', bolOther:'', ads:'', rent:'', shopOther:'', shopFulfilment:'' };
let settings = { ...defaults }, mode = 'bol', period = 1, purchaseMode = 'amount';
try { settings = { ...defaults, ...JSON.parse(localStorage.getItem('winsttool-settings')) }; } catch (_) {}
try { const state = JSON.parse(localStorage.getItem('winsttool-state')); mode = state?.mode || mode; period = state?.period || period; purchaseMode = state?.purchaseMode || purchaseMode; ['sale','purchase','revenue','orders','shopPurchase'].forEach(id => $(id).value = state?.[id] || ''); } catch (_) {}
[...bolIds, ...shopIds].forEach(id => $(id).value = settings[id]);
function saveState() { localStorage.setItem('winsttool-state', JSON.stringify({ mode, period, purchaseMode, sale:$('sale').value, purchase:$('purchase').value, revenue:$('revenue').value, orders:$('orders').value, shopPurchase:$('shopPurchase').value })); }
function renderMode() {
  const webshop = mode === 'webshop';
  const purchaseSwitch = document.querySelector('.purchase-mode'); purchaseSwitch.classList.add('period-switch'); purchaseSwitch.style.gridTemplateColumns = '1fr 1fr'; purchaseSwitch.style.marginBottom = '8px';
  document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('selected', button.dataset.mode === mode));
  $('bolInputs').classList.toggle('hidden', webshop); $('webshopInputs').classList.toggle('hidden', !webshop);
  $('bolSettings').classList.toggle('hidden', webshop); $('webshopSettings').classList.toggle('hidden', !webshop);
  $('eyebrow').textContent = webshop ? 'WEBSHOP REKENTOOL' : 'BOL.COM REKENTOOL';
  $('intro').textContent = webshop ? 'Kies een periode en vul omzet en bestellingen in.' : 'Vul verkoopprijs en inkoop in. De rest staat in je instellingen.';
  $('settingsEyebrow').textContent = webshop ? 'WEBSHOP KOSTEN' : 'BOL.COM KOSTEN';
  $('settingsIntro').textContent = webshop ? 'Kosten zijn excl. btw. Dagelijkse kosten worden automatisch omgerekend.' : 'Alle kosten zijn excl. btw en worden bewaard voor je volgende berekeningen.';
  $('netSaleLabel').innerHTML = webshop ? 'Netto omzet <small>(excl. btw)</small>' : 'Netto verkoopprijs <small>(excl. btw)</small>';
  $('middleLabel').textContent = webshop ? 'Dagelijkse kosten' : 'Commissie';
  $('note').textContent = webshop ? 'Een maand wordt berekend als 30 dagen.' : 'Commissie: vast bedrag + percentage van de netto verkoopprijs.';
  document.querySelectorAll('[data-period]').forEach(button => button.classList.toggle('selected', Number(button.dataset.period) === period));
  document.querySelectorAll('[data-purchase-mode]').forEach(button => button.classList.toggle('selected', button.dataset.purchaseMode === purchaseMode));
  $('shopPurchaseLabel').innerHTML = purchaseMode === 'amount' ? 'Inkoopkosten <small>(excl. btw)</small>' : 'Inkoopkosten <small>(% van netto omzet)</small>';
  $('shopPurchasePrefix').classList.toggle('hidden', purchaseMode === 'percentage'); $('shopPurchaseSuffix').classList.toggle('hidden', purchaseMode !== 'percentage');
  saveState(); calculate();
}
function calculate() {
  let net, middle, costs;
  if (mode === 'bol') { net = read('sale') / 1.21; middle = read('fixedCommission') + net * read('commissionRate') / 100; costs = read('purchase') + middle + read('bolFulfilment') + read('shipping') + read('bolOther'); }
  else { net = read('revenue') / 1.21; middle = (read('ads') + read('rent') + read('shopOther')) * period; const purchaseCost = purchaseMode === 'amount' ? read('shopPurchase') : net * read('shopPurchase') / 100; costs = middle + purchaseCost + read('orders') * read('shopFulfilment'); }
  const profit = net - costs, margin = net ? profit / net * 100 : 0;
  $('netSale').textContent = euro.format(net); $('middleCost').textContent = `− ${euro.format(middle)}`; $('totalCost').textContent = `− ${euro.format(costs)}`;
  $('profit').textContent = euro.format(profit); $('margin').textContent = `${decimal.format(margin)}% winstmarge`; document.querySelector('.profit').classList.toggle('negative', profit < 0); saveState();
}
function saveSettings() { [...bolIds, ...shopIds].forEach(id => settings[id] = $(id).value); localStorage.setItem('winsttool-settings', JSON.stringify(settings)); calculate(); }
['sale','purchase','revenue','orders','shopPurchase', ...bolIds, ...shopIds].forEach(id => $(id).addEventListener('input', calculate));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; renderMode(); }));
document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => { period = Number(button.dataset.period); renderMode(); }));
document.querySelectorAll('[data-purchase-mode]').forEach(button => button.addEventListener('click', () => { purchaseMode = button.dataset.purchaseMode; renderMode(); }));
$('openSettings').addEventListener('click', () => $('settingsDialog').showModal()); $('saveSettings').addEventListener('click', saveSettings);
$('reset').addEventListener('click', () => { const ids = mode === 'bol' ? ['sale','purchase'] : ['revenue','orders']; ids.forEach(id => $(id).value = ''); calculate(); $(ids[0]).focus(); });
renderMode(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
