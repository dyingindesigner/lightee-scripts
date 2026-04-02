(function(){
function n(t){return(t||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function p(t){var m=n(t).match(/(\d+(?:[.,]\d{1,2})?)/);return m?parseFloat(m[1].replace(',','.')):null}
function f(v){return v==null?'':'€'+v.toLocaleString('sk-SK',{minimumFractionDigits:2,maximumFractionDigits:2})}

function getState(){
var s={groupId:null,loggedIn:false},srcs=[
window.eeCustomer,
window.customer,
window.shoptet&&window.shoptet.customer,
window.shoptet&&window.shoptet.config&&window.shoptet.config.customer,
window.Shoptet&&window.Shoptet.customer
],i,o,v;

for(i=0;i<srcs.length;i++){
o=srcs[i];
if(!o||typeof o!=='object')continue;
v=Number(o.groupId);
if(!isNaN(v))s.groupId=v;
if(o.registered===true||o.mainAccount===true)s.loggedIn=true;
}

if(Array.isArray(window.dataLayer)){
for(i=0;i<dataLayer.length;i++){
o=dataLayer[i]||{};
var list=[
o,
o.customer,
o.shoptet&&o.shoptet.customer,
o.ecommerce&&o.ecommerce.customer,
o.page&&o.page.customer
];
for(var j=0;j<list.length;j++){
var c=list[j];
if(!c||typeof c!=='object')continue;
v=Number(c.groupId);
if(!isNaN(v))s.groupId=v;
if(c.registered===true||c.mainAccount===true)s.loggedIn=true;
}
}
}

if(!s.loggedIn){
var acc=Array.from(document.querySelectorAll('a,button')).some(function(el){
var t=n(el.textContent);
return t==='Môj účet'||t.indexOf('Môj účet')!==-1;
});
if(acc)s.loggedIn=true;
}

return s;
}

function setNet(el){
if(!el)return;
var txt=n(el.textContent);
if(!txt||/ZADARMO|bez DPH|s DPH/i.test(txt))return;
if(el.dataset.eeRendered===txt)return;

var gross=parseFloat(el.dataset.eeGrossOriginal||'');
if(isNaN(gross)){
gross=p(txt);
if(gross==null)return;
el.dataset.eeGrossOriginal=gross;
}

var next=txt.replace(/€\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*€/i,f(gross/1.23));
if(next===txt)return;

el.textContent=next;
el.dataset.eeRendered=n(next);
}

function swapBlocks(){
document.querySelectorAll('.prices,.p-final-price-wrapper').forEach(function(box){
var ex=box.querySelector('.price-additional'),
    main=box.querySelector('.price-final-holder,.price-final strong,.price-final');
if(!ex||!main)return;

var xt=n(ex.textContent),mt=n(main.textContent),
    xv=p(xt),mv=p(mt);

if(!/bez DPH/i.test(xt)||xv==null||mv==null)return;

var mark=mv+'|'+xv;
if(box.dataset.eeSwap===mark)return;

var suf=mt.replace(/^.*?(€\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*€)/,'').trim();
main.textContent=f(xv)+(suf&&suf.length<12?' '+suf:'');
ex.textContent=f(mv)+' s DPH';
ex.style.opacity='.75';
ex.style.fontSize='.9em';
box.dataset.eeSwap=mark;
});
}

function ensureVatNote(target,gross){
var parent=target.parentElement;
if(!parent)return;
var extra=parent.querySelector('.price-additional.ee-b2b-vat-note');
if(!extra){
extra=document.createElement('span');
extra.className='price-additional ee-b2b-vat-note';
target.insertAdjacentElement('afterend',extra);
}
extra.textContent=f(gross)+' s DPH';
extra.style.display='block';
extra.style.opacity='.75';
extra.style.fontSize='.9em';
}

function swapCartRowTotals(){
document.querySelectorAll('td.p-total[data-testid="cellTotalPrice"] .price-final[data-testid="cartPrice"], td.p-total[data-testid="cellTotalPrice"] .price-final').forEach(function(el){
var txt=n(el.textContent);
var gross=parseFloat(el.dataset.eeGrossOriginal||'');
if(isNaN(gross)){
gross=p(txt);
if(gross==null)return;
el.dataset.eeGrossOriginal=gross;
}
var net=gross/1.23;
var next=f(net);
if(n(el.textContent)!==n(next))el.textContent=next;
el.dataset.eeRendered=n(next);
ensureVatNote(el,gross);
});
}

function swapCartUnitPrices(){
document.querySelectorAll('td.p-price.p-cell .price-final[data-testid="cartItemPrice"], td.p-price .price-final[data-testid="cartItemPrice"]').forEach(function(el){
var txt=n(el.textContent);
var gross=parseFloat(el.dataset.eeGrossOriginal||'');
if(isNaN(gross)){
gross=p(txt);
if(gross==null)return;
el.dataset.eeGrossOriginal=gross;
}
var net=gross/1.23;
var next=f(net);
if(n(el.textContent)!==n(next))el.textContent=next;
el.dataset.eeRendered=n(next);
ensureVatNote(el,gross);
});
}

function swapMiniCart(){
document.querySelectorAll(
'.cart-price[data-testid="headerCartPrice"],'+
'.cart-price.visible-lg-inline-block,'+
'.cart-overview-final-price,'+
'[data-testid="cartWidgetProductPrice"],'+
'[data-testid="recapItemPrice"]'
).forEach(setNet);
}

function run(){
var s=getState();
if(!s.loggedIn)return;
if(s.groupId==null||Number(s.groupId)===1)return;
swapBlocks();
swapCartRowTotals();
swapCartUnitPrices();
swapMiniCart();
}

var timer=null;
function schedule(){
clearTimeout(timer);
timer=setTimeout(run,120);
}

function boot(){
run();
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
document.addEventListener('ShoptetDOMPageContentLoaded',schedule);
window.addEventListener('load',schedule);
}

if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',boot);
}else{
boot();
}
})();
