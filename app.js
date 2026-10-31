'use strict';
const $ = id => document.getElementById(id);
const euro = new Intl.NumberFormat('nl-NL', {style:'currency', currency:'EUR'});
const decimal = new Intl.NumberFormat('nl-NL', {minimumFractionDigits:1, maximumFractionDigits:1});
const bolIds = ['fixedCommission','commissionRate','bolFulfilment','shipping','bolOther','articlesPerOrder','bolDaily'];
const shopIds = ['ads','rent','shopOther','shopFulfilment'];
const productIds = ['productSale','productPurchase','productCommission','productFixed','productFulfilment','productShipping','productPackaging','productPayment','productPaymentFixed','productAds'];
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
let mode = ['bol','webshop','total','product'].includes(previous.mode) ? previous.mode : 'bol';
let period = [1,7,30].includes(Number(previous.period)) ? Number(previous.period) : 1;
let bolPurchaseMode = previous.bolPurchaseMode === 'percentage' ? 'percentage' : 'amount';
let purchaseMode = previous.purchaseMode === 'percentage' ? 'percentage' : 'amount';
let productPurchaseMode=previous.productPurchaseMode==='percentage'?'percentage':'amount';
$('productChannel').value=previous.productChannel==='webshop'?'webshop':'bol';
inputIds.forEach(id => $(id).value = previous[id] ?? '');
productIds.forEach(id=>$(id).value=previous[id] ?? $(id).value);
const channelCostIds=productIds.filter(id=>!['productSale','productPurchase'].includes(id));
let activeProductChannel=$('productChannel').value;
const emptyChannelCosts=()=>Object.fromEntries(channelCostIds.map(id=>[id,id==='productCommission'?'15':id==='productFixed'?'1':'']));
const channelCosts={bol:emptyChannelCosts(),webshop:emptyChannelCosts()};
for(const channel of ['bol','webshop']) {
 const saved=previous.channelCosts?.[channel];
 if(saved && typeof saved==='object') channelCostIds.forEach(id=>channelCosts[channel][id]=saved[id] ?? channelCosts[channel][id]);
}
// Legacy shared costs belong only to the previously selected channel.
if(!previous.channelCosts) channelCostIds.forEach(id=>channelCosts[activeProductChannel][id]=$(id).value);
function loadChannelCosts(){channelCostIds.forEach(id=>$(id).value=channelCosts[activeProductChannel][id]);}
function captureChannelCosts(){channelCostIds.forEach(id=>channelCosts[activeProductChannel][id]=$(id).value);}
loadChannelCosts();
// The old Bol calculation represented exactly one article/order.
if (previous.bolOrders === undefined && (previous.sale || previous.purchase)) $('bolOrders').value = '1';
// Convert old per-article inputs once, retaining a backup of the original state.
if (Number(previous.version || 0) < 7 && (previous.sale || previous.purchase)) {
  persist('winsttool-state-before-v7', previous);
  const quantity = number($('bolOrders').value) * number(settings.articlesPerOrder);
  if (Number.isFinite(quantity)) {
    ['sale','purchase'].forEach(id => {const value=number($(id).value);if(Number.isFinite(value)) $(id).value=String(value*quantity);});
    $('storageNotice').textContent='Je oude Bol-bedragen per artikel zijn omgerekend naar periodetotalen. Controleer deze bedragen.';
    $('storageNotice').classList.remove('hidden');
  }
}
function fillSettings() {[...bolIds,...shopIds].forEach(id => $(id).value = settings[id]);}
fillSettings();
function saveState() {captureChannelCosts();persist('winsttool-state',{...previous,version:9,channelCosts,mode,period,purchaseMode,bolPurchaseMode,productPurchaseMode,productChannel:$('productChannel').value,...Object.fromEntries(productIds.map(id=>[id,$(id).value])),...Object.fromEntries(inputIds.map(id=>[id,$(id).value]))});}
function valid(id) {const n=number($(id).value); const ok=Number.isFinite(n) && (!['bolOrders','orders'].includes(id) || Number.isInteger(n)) && (id!=='articlesPerOrder' || n>=1);$(id).setAttribute('aria-invalid',String(!ok));$(id).setCustomValidity(ok?'':'Vul een geldig positief getal in; bestellingen zijn hele aantallen.');return ok;}
function result(net,costs,middle) {const profit=net-costs;return {net,costs,middle,profit,margin:net>0?profit/net*100:null};}
function compute(values, costs, days, purchaseType, bolPurchaseType='amount') {
  const count=values.bolOrders, articles=count*costs.articlesPerOrder;
  const gross=values.sale;
  const bolPurchase=bolPurchaseType==='percentage'?gross/1.21*values.purchase/100:values.purchase;
  const commission=articles*costs.fixedCommission+gross*costs.commissionRate/100;
  const bol=result(gross/1.21,bolPurchase+articles*costs.bolOther+commission+count*(costs.bolFulfilment+costs.shipping)+days*costs.bolDaily,commission);
  const net=values.revenue/1.21;
  const daily=days*(costs.ads+costs.rent+costs.shopOther);
  const shop=result(net,daily+values.orders*costs.shopFulfilment+(purchaseType==='percentage'?net*values.shopPurchase/100:values.shopPurchase),daily);
  bol.details={'Inkoop':bolPurchase,'Commissie':commission,'Fulfilment':count*costs.bolFulfilment,'Verzending':count*costs.shipping,'Overige artikelkosten':articles*costs.bolOther,'Vaste kosten':days*costs.bolDaily};
  shop.details={'Inkoop':purchaseType==='percentage'?net*values.shopPurchase/100:values.shopPurchase,'Advertenties':days*costs.ads,'Huur':days*costs.rent,'Overige dagkosten':days*costs.shopOther,'Fulfilment':values.orders*costs.shopFulfilment};
  const total=result(bol.net+shop.net,bol.costs+shop.costs,0);
  total.details={'Kosten Bol.com':bol.costs,'Kosten Webshop':shop.costs};
  return {bol,webshop:shop,total};
}
function calculate() {
  saveState();
  const bolOK=['sale','purchase','bolOrders'].map(valid).every(Boolean) && bolIds.every(id=>Number.isFinite(number(settings[id])) && (id!=='articlesPerOrder'||number(settings[id])>=1));
  const shopOK=['revenue','orders','shopPurchase'].map(valid).every(Boolean) && shopIds.every(id=>Number.isFinite(number(settings[id])));
  const results=compute(Object.fromEntries(inputIds.map(id=>[id,number($(id).value)])),Object.fromEntries([...bolIds,...shopIds].map(id=>[id,number(settings[id])])),period,purchaseMode,bolPurchaseMode);
  $('bolProfit').textContent=bolOK?euro.format(results.bol.profit):'Controleer invoer';
  $('shopProfit').textContent=shopOK?euro.format(results.webshop.profit):'Controleer invoer';
  const productOK=productIds.filter(id=>!($('productChannel').value==='bol'?['productPayment','productPaymentFixed']:['productCommission','productFixed']).includes(id)).map(valid).every(Boolean);
  results.product=computeProduct(Object.fromEntries(productIds.map(id=>[id,number($(id).value)])),$('productChannel').value,productPurchaseMode);
  const ok=mode==='product'?productOK:mode==='bol'?bolOK:mode==='webshop'?shopOK:bolOK&&shopOK;
  const r=results[mode];
  $('costDetails').innerHTML=ok?Object.entries(r.details).map(([label,value])=>`<div><span>${label}</span><b>${euro.format(value)}</b></div>`).join(''):'<p>Controleer je invoer.</p>';
  const missingBol=number($('sale').value)>0 && number($('bolOrders').value)===0;
  const missingShop=number($('revenue').value)>0 && number($('orders').value)===0;
  $('inputHint').textContent=mode==='product'?'':(mode!=='webshop'&&missingBol)||(mode!=='bol'&&missingShop)?'Je hebt omzet ingevuld zonder bestellingen. Vul het aantal in om kosten per bestelling mee te rekenen.':'';
  $('netSale').textContent=ok?euro.format(r.net):'—';$('totalCost').textContent=ok?euro.format(r.costs):'—';$('middleCost').textContent=ok?euro.format(r.middle):'—';
  $('profit').textContent=ok?euro.format(r.profit):'Controleer invoer';
  $('profitLabel').textContent=mode==='product'?(ok&&r.profit<0?'VERLIES PER VERKOOP':'OVER PER VERKOOP'):(ok&&r.profit<0?'NETTO VERLIES':'NETTO WINST');
  $('margin').textContent=!ok?'Gebruik positieve bedragen en hele bestellingen.':r.margin===null?'Geen winstmarge zonder omzet':`${decimal.format(r.margin)}% winstmarge`;
  document.querySelector('.profit').classList.toggle('negative',ok&&r.profit<0);
}
function renderMode() {
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
  $('productInputs').classList.toggle('hidden',mode!=='product');
  document.querySelector('.period-card').classList.toggle('hidden',mode==='product');
  $('bolInputs').classList.toggle('hidden',mode!=='bol');$('webshopInputs').classList.toggle('hidden',mode!=='webshop');$('overview').classList.toggle('hidden',mode!=='total');
  $('openSettings').classList.toggle('hidden',['total','product'].includes(mode));$('reset').classList.toggle('hidden',mode==='total');$('middleRow').classList.toggle('hidden',['total','product'].includes(mode));
  $('bolSettings').classList.toggle('hidden',mode!=='bol');$('webshopSettings').classList.toggle('hidden',mode!=='webshop');
  $('eyebrow').textContent={bol:'BOL.COM REKENTOOL',webshop:'WEBSHOP REKENTOOL',product:'PRODUCTBEREKENING',total:'TOTAALOVERZICHT'}[mode];
  $('intro').textContent={bol:'Vul je omzet, bestellingen en inkoop voor de hele periode in.',webshop:'Vul je omzet, bestellingen en inkoop voor de hele periode in.',product:'Bereken wat je overhoudt aan één verkoop. Deze berekening telt niet mee in het totaaloverzicht.',total:'Bol.com en Webshop samen, voor dezelfde gekozen periode.'}[mode];
  $('settingsEyebrow').textContent=mode==='bol'?'BOL.COM KOSTEN':'WEBSHOP KOSTEN';
  $('settingsIntro').textContent=mode==='bol'?'Kosten excl. btw. Vul je eigen tarieven in. Fulfilment is het gemiddelde per bestelling; vul verzending alleen apart in als die nog niet is inbegrepen.':'Kosten excl. btw. Dagkosten × 1, 7 of 30; fulfilment × bestellingen. Boek gedeelde vaste kosten maar één keer.';
  $('netSaleLabel').textContent='Netto omzet (excl. btw)';$('middleLabel').textContent=mode==='bol'?'Waarvan commissie':'Waarvan dagelijkse kosten';
  $('note').textContent={bol:'21% btw. Commissie over omzet incl. btw + vast bedrag per artikel. Overige kosten per artikel; vaste kosten per dag. Controleer je tarieven in Instellingen.',webshop:'21% btw. Inkoop is het totaal voor de periode, of een percentage van netto omzet. Dagkosten tellen ook mee zonder bestellingen.',product:'21% btw. Inkooppercentage over de verkoopprijs excl. btw. Resultaat vóór vaste bedrijfskosten en winstbelasting. Bol-tarieven zijn voorbeelden: vul je eigen tarieven in.',total:'Marge = totale winst ÷ totale netto omzet. Vaste kosten tellen ook zonder omzet mee. Gedeelde kosten slechts bij één kanaal invoeren. Winst vóór inkomsten- of vennootschapsbelasting.'}[mode];
  document.querySelectorAll('[data-period]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.period)===period);b.setAttribute('aria-pressed',String(Number(b.dataset.period)===period));});
  document.querySelectorAll('[data-purchase-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.purchaseMode===purchaseMode);b.setAttribute('aria-pressed',String(b.dataset.purchaseMode===purchaseMode));});
  document.querySelectorAll('[data-bol-purchase-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.bolPurchaseMode===bolPurchaseMode);b.setAttribute('aria-pressed',String(b.dataset.bolPurchaseMode===bolPurchaseMode));});
  $('bolPurchaseLabel').textContent=bolPurchaseMode==='amount'?'Inkoopkosten (hele periode, excl. btw)':'Inkoopkosten (% van netto omzet)';
  $('bolPurchasePrefix').classList.toggle('hidden',bolPurchaseMode==='percentage');$('bolPurchaseSuffix').classList.toggle('hidden',bolPurchaseMode!=='percentage');
  $('shopPurchaseLabel').textContent=purchaseMode==='amount'?'Inkoopkosten (hele periode, excl. btw)':'Inkoopkosten (% van netto omzet)';
  $('shopPurchasePrefix').classList.toggle('hidden',purchaseMode==='percentage');$('shopPurchaseSuffix').classList.toggle('hidden',purchaseMode!=='percentage');
  renderProduct();
  calculate();
}
inputIds.forEach(id=>$(id).addEventListener('input',calculate));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;renderMode();}));
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=Number(b.dataset.period);renderMode();}));
document.querySelectorAll('[data-purchase-mode]').forEach(b=>b.addEventListener('click',()=>{switchPurchase('webshop',b.dataset.purchaseMode);}));
function switchPurchase(channel,next) {
  const old=channel==='bol'?bolPurchaseMode:purchaseMode;
  if(old===next)return;
  const id=channel==='bol'?'purchase':'shopPurchase';
  const net=number($(channel==='bol'?'sale':'revenue').value)/1.21;
  const value=number($(id).value);
  if($(id).value && Number.isFinite(value) && Number.isFinite(net)) $(id).value=next==='amount'?String(Number((net*value/100).toFixed(6))):net>0?String(Number((value/net*100).toFixed(6))):'';
  if(channel==='bol')bolPurchaseMode=next;else purchaseMode=next;
  renderMode();
}
document.querySelectorAll('[data-bol-purchase-mode]').forEach(b=>b.addEventListener('click',()=>switchPurchase('bol',b.dataset.bolPurchaseMode)));
$('openSettings').addEventListener('click',()=>{fillSettings();[...bolIds,...shopIds].forEach(id=>$(id).setCustomValidity(''));$('settingsDialog').showModal();});
$('saveSettings').addEventListener('click',e=>{const ids=mode==='bol'?bolIds:shopIds;if(!ids.map(valid).every(Boolean)){e.preventDefault();ids.find(id=>!$(id).checkValidity())&&$(ids.find(id=>!$(id).checkValidity())).reportValidity();return;}ids.forEach(id=>settings[id]=$(id).value);persist('winsttool-settings',settings);calculate();});
$('reset').addEventListener('click',()=>{const ids=mode==='product'?['productSale','productPurchase']:mode==='bol'?['sale','purchase','bolOrders']:['revenue','orders','shopPurchase'];ids.forEach(id=>$(id).value='');calculate();$(ids[0]).focus();});

function computeProduct(v,channel,purchaseType) {
 const net=v.productSale/1.21;
 const purchase=purchaseType==='percentage'?net*v.productPurchase/100:v.productPurchase;
 const fee=channel==='bol'?v.productFixed+v.productSale*v.productCommission/100:v.productPaymentFixed+v.productSale*v.productPayment/100;
 const details={'Inkoop':purchase,[channel==='bol'?'Bol-commissie':'Betaalkosten']:fee,'Fulfilment':v.productFulfilment,'Verzending':v.productShipping,'Verpakking':v.productPackaging,'Advertenties':v.productAds};
 const r=result(net,Object.values(details).reduce((a,b)=>a+b,0),fee);r.details=details;return r;
}
function renderProduct(){
 const bol=$('productChannel').value==='bol';
 $('productCostsTitle').textContent=bol?'Directe kosten · Bol.com':'Directe kosten · Webshop';
 $('productCostsNote').textContent='Deze kosten worden apart bewaard voor '+(bol?'Bol.com':'Webshop')+'. Alle bedragen excl. btw. Tel verzending niet dubbel wanneer die in fulfilment zit.';
 $('productBolCosts').classList.toggle('hidden',!bol);$('productShopCosts').classList.toggle('hidden',bol);
 $('productPurchaseLabel').textContent=productPurchaseMode==='amount'?'Inkoopprijs (€ excl. btw)':'Inkoop (% van verkoopprijs excl. btw)';
 $('productPurchasePrefix').classList.toggle('hidden',productPurchaseMode==='percentage');$('productPurchaseSuffix').classList.toggle('hidden',productPurchaseMode!=='percentage');
 document.querySelectorAll('[data-product-purchase-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.productPurchaseMode===productPurchaseMode);b.setAttribute('aria-pressed',String(b.dataset.productPurchaseMode===productPurchaseMode));});
}
productIds.forEach(id=>$(id).addEventListener('input',calculate));
$('productChannel').addEventListener('change',()=>{captureChannelCosts();activeProductChannel=$('productChannel').value;loadChannelCosts();renderProduct();calculate();});
document.querySelectorAll('[data-product-purchase-mode]').forEach(b=>b.addEventListener('click',()=>{
 const next=b.dataset.productPurchaseMode;if(next===productPurchaseMode)return;
 const net=number($('productSale').value)/1.21,v=number($('productPurchase').value);
 if($('productPurchase').value&&Number.isFinite(v)&&Number.isFinite(net)){
  if(next==='percentage'&&net===0){$('inputHint').textContent='Vul eerst een verkoopprijs in om het bedrag om te rekenen naar een percentage.';return;}
  $('productPurchase').value=String(Number((next==='amount'?net*v/100:v/net*100).toFixed(6)));
 }
 productPurchaseMode=next;renderProduct();calculate();
}));
renderMode();
if ('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('service-worker.js').catch(()=>{});
