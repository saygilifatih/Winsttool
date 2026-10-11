'use strict';
const $ = id => document.getElementById(id);
const euro = new Intl.NumberFormat('nl-NL', {style:'currency', currency:'EUR'});
const decimal = new Intl.NumberFormat('nl-NL', {minimumFractionDigits:1, maximumFractionDigits:1});
const bolIds = ['fixedCommission','commissionRate','bolFulfilment','shipping','bolOther','articlesPerOrder','bolDaily'];
const shopIds = ['ads','rent','shopOther','shopFulfilment'];
const inputIds = ['sale','purchase','bolOrders','revenue','orders','shopPurchase'];
const defaults = {fixedCommission:'1',commissionRate:'15',bolFulfilment:'',shipping:'',bolOther:'',articlesPerOrder:'1',bolDaily:'',ads:'',rent:'',shopOther:'',shopFulfilment:''};
// Dutch comma decimals and grouped amounts; malformed/negative input is never silently calculated.
function number(value) {
  let s = String(value ?? '').trim().replace(/[\s€]/g,'');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s); return Number.isFinite(n) && n <= 1e12 ? n : NaN;
}
function stored(key) {try {const v = JSON.parse(localStorage.getItem(key)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {};} catch (_) {return {};}}
function persist(key,value) {try {localStorage.setItem(key,JSON.stringify(value));} catch (_) {$('storageNotice').textContent='Bewaren lukt niet in deze browser. Je kunt wel blijven rekenen.';$('storageNotice').classList.remove('hidden');}}
let settings = {...defaults,...stored('winsttool-settings')};
const previous = stored('winsttool-state');
let mode = ['bol','webshop','total'].includes(previous.mode) ? previous.mode : 'bol';
let period = [1,7,30].includes(Number(previous.period)) ? Number(previous.period) : 1;
let purchaseMode = previous.purchaseMode === 'percentage' ? 'percentage' : 'amount';
inputIds.forEach(id => $(id).value = previous[id] ?? '');
// The old Bol calculation represented exactly one article/order.
if (previous.bolOrders === undefined && (previous.sale || previous.purchase)) $('bolOrders').value = '1';
function fillSettings() {[...bolIds,...shopIds].forEach(id => $(id).value = settings[id]);}
fillSettings();
function saveState() {persist('winsttool-state',{...previous,version:6,mode,period,purchaseMode,...Object.fromEntries(inputIds.map(id=>[id,$(id).value]))});}
function valid(id) {const n=number($(id).value); const ok=Number.isFinite(n) && (!['bolOrders','orders'].includes(id) || Number.isInteger(n)) && (id!=='articlesPerOrder' || n>=1);$(id).setAttribute('aria-invalid',String(!ok));$(id).setCustomValidity(ok?'':'Vul een geldig positief getal in; bestellingen zijn hele aantallen.');return ok;}
function result(net,costs,middle) {const profit=net-costs;return {net,costs,middle,profit,margin:net>0?profit/net*100:null};}
function compute(values, costs, days, purchaseType) {
  const count=values.bolOrders, articles=count*costs.articlesPerOrder;
  const gross=values.sale*articles;
  const commission=articles*costs.fixedCommission+gross*costs.commissionRate/100;
  const bol=result(gross/1.21,articles*(values.purchase+costs.bolOther)+commission+count*(costs.bolFulfilment+costs.shipping)+days*costs.bolDaily,commission);
  const net=values.revenue/1.21;
  const daily=days*(costs.ads+costs.rent+costs.shopOther);
  const shop=result(net,daily+values.orders*costs.shopFulfilment+(purchaseType==='percentage'?net*values.shopPurchase/100:values.shopPurchase),daily);
  return {bol,webshop:shop,total:result(bol.net+shop.net,bol.costs+shop.costs,0)};
}
function calculate() {
  saveState();
  const bolOK=['sale','purchase','bolOrders'].map(valid).every(Boolean) && bolIds.every(id=>Number.isFinite(number(settings[id])) && (id!=='articlesPerOrder'||number(settings[id])>=1));
  const shopOK=['revenue','orders','shopPurchase'].map(valid).every(Boolean) && shopIds.every(id=>Number.isFinite(number(settings[id])));
  const results=compute(Object.fromEntries(inputIds.map(id=>[id,number($(id).value)])),Object.fromEntries([...bolIds,...shopIds].map(id=>[id,number(settings[id])])),period,purchaseMode);
  $('bolProfit').textContent=bolOK?euro.format(results.bol.profit):'Controleer invoer';
  $('shopProfit').textContent=shopOK?euro.format(results.webshop.profit):'Controleer invoer';
  const ok=mode==='bol'?bolOK:mode==='webshop'?shopOK:bolOK&&shopOK;
  const r=results[mode];
  $('netSale').textContent=ok?euro.format(r.net):'—';$('totalCost').textContent=ok?euro.format(r.costs):'—';$('middleCost').textContent=ok?euro.format(r.middle):'—';
  $('profit').textContent=ok?euro.format(r.profit):'Controleer invoer';
  $('profitLabel').textContent=ok&&r.profit<0?'NETTO VERLIES':'NETTO WINST';
  $('margin').textContent=!ok?'Gebruik positieve bedragen en hele bestellingen.':r.margin===null?'Geen winstmarge zonder omzet':`${decimal.format(r.margin)}% winstmarge`;
  document.querySelector('.profit').classList.toggle('negative',ok&&r.profit<0);
}
function renderMode() {
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
  $('bolInputs').classList.toggle('hidden',mode!=='bol');$('webshopInputs').classList.toggle('hidden',mode!=='webshop');$('overview').classList.toggle('hidden',mode!=='total');
  $('openSettings').classList.toggle('hidden',mode==='total');$('reset').classList.toggle('hidden',mode==='total');$('middleRow').classList.toggle('hidden',mode==='total');
  $('bolSettings').classList.toggle('hidden',mode!=='bol');$('webshopSettings').classList.toggle('hidden',mode!=='webshop');
  $('eyebrow').textContent={bol:'BOL.COM REKENTOOL',webshop:'WEBSHOP REKENTOOL',total:'TOTAALOVERZICHT'}[mode];
  $('intro').textContent={bol:'Vul gemiddelde bedragen per artikel en het aantal bestellingen in.',webshop:'Vul je omzet, bestellingen en inkoop voor de hele periode in.',total:'Bol.com en Webshop samen, voor dezelfde gekozen periode.'}[mode];
  $('settingsEyebrow').textContent=mode==='bol'?'BOL.COM KOSTEN':'WEBSHOP KOSTEN';
  $('settingsIntro').textContent=mode==='bol'?'Kosten excl. btw. Vul je eigen tarieven in. Fulfilment is het gemiddelde per bestelling; vul verzending alleen apart in als die nog niet is inbegrepen.':'Kosten excl. btw. Dagkosten × 1, 7 of 30; fulfilment × bestellingen. Boek gedeelde vaste kosten maar één keer.';
  $('netSaleLabel').textContent='Netto omzet (excl. btw)';$('middleLabel').textContent=mode==='bol'?'Waarvan commissie':'Waarvan dagelijkse kosten';
  $('note').textContent={bol:'21% btw. Commissie over omzet incl. btw + vast bedrag per artikel. Overige kosten per artikel; vaste kosten per dag. Controleer je tarieven in Instellingen.',webshop:'21% btw. Inkoop is het totaal voor de periode, of een percentage van netto omzet. Dagkosten tellen ook mee zonder bestellingen.',total:'Marge = totale winst ÷ totale netto omzet. Vaste kosten tellen ook zonder omzet mee. Gedeelde kosten slechts bij één kanaal invoeren. Winst vóór inkomsten- of vennootschapsbelasting.'}[mode];
  document.querySelectorAll('[data-period]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.period)===period);b.setAttribute('aria-pressed',String(Number(b.dataset.period)===period));});
  document.querySelectorAll('[data-purchase-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.purchaseMode===purchaseMode);b.setAttribute('aria-pressed',String(b.dataset.purchaseMode===purchaseMode));});
  $('shopPurchaseLabel').textContent=purchaseMode==='amount'?'Inkoopkosten (hele periode, excl. btw)':'Inkoopkosten (% van netto omzet)';
  $('shopPurchasePrefix').classList.toggle('hidden',purchaseMode==='percentage');$('shopPurchaseSuffix').classList.toggle('hidden',purchaseMode!=='percentage');
  calculate();
}
inputIds.forEach(id=>$(id).addEventListener('input',calculate));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;renderMode();}));
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=Number(b.dataset.period);renderMode();}));
document.querySelectorAll('[data-purchase-mode]').forEach(b=>b.addEventListener('click',()=>{purchaseMode=b.dataset.purchaseMode;renderMode();}));
$('openSettings').addEventListener('click',()=>{fillSettings();[...bolIds,...shopIds].forEach(id=>$(id).setCustomValidity(''));$('settingsDialog').showModal();});
$('saveSettings').addEventListener('click',e=>{const ids=mode==='bol'?bolIds:shopIds;if(!ids.map(valid).every(Boolean)){e.preventDefault();ids.find(id=>!$(id).checkValidity())&&$(ids.find(id=>!$(id).checkValidity())).reportValidity();return;}ids.forEach(id=>settings[id]=$(id).value);persist('winsttool-settings',settings);calculate();});
$('reset').addEventListener('click',()=>{const ids=mode==='bol'?['sale','purchase','bolOrders']:['revenue','orders','shopPurchase'];ids.forEach(id=>$(id).value='');calculate();$(ids[0]).focus();});
renderMode();
if ('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('service-worker.js').catch(()=>{});
