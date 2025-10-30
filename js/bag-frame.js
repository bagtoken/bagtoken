/*! $BAG — Universal Game Frame (Dice-exact wiring generalized)
 *  Brings: pricing, demo session, audio, HUD, stake wire, quick amounts, rules modal, win readout
 *  You keep your game logic and DOM inside #gameStage untouched
 */

(() => {
  // ---------- AUDIO CORE ----------
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let AC=null, MASTER=null, lastTap=0;
  function getAC(){ if(AC&&AC.state!=='closed')return AC; if(!AudioCtx)return null;
    AC=new AudioCtx({latencyHint:'interactive',sampleRate:44100}); MASTER=AC.createGain(); MASTER.gain.value=.22; MASTER.connect(AC.destination); return AC; }
  async function resume(){ const ac=getAC(); if(!ac) return; if(ac.state==='suspended'){ try{ await ac.resume(); }catch{} } }
  function ping(){ try{ const ac=getAC(); if(!ac||ac.state!=='running')return; const o=ac.createOscillator(), g=ac.createGain(); g.gain.value=.0001; o.connect(g).connect(MASTER);
    const t=ac.currentTime; o.start(t); o.stop(t+.02);}catch{}}
  addEventListener('pointerdown', ()=>{ lastTap=Date.now(); resume(); ping(); }, {passive:true});
  addEventListener('visibilitychange', ()=>{ if(!document.hidden) resume(); });

  // tiny sfx
  function chime(){ const ac=getAC(); if(!ac||ac.state!=='running')return; const now=ac.currentTime;
    [880,1320,1760].forEach((f,i)=>{ const o=ac.createOscillator(); o.type='triangle'; o.frequency.value=f; const g=ac.createGain();
      g.gain.setValueAtTime(.0001,now+i*.02); g.gain.linearRampToValueAtTime(.18,now+i*.02+.04); g.gain.exponentialRampToValueAtTime(.0001,now+i*.02+.32);
      o.connect(g).connect(MASTER); o.start(now+i*.02); o.stop(now+i*.02+.34); });
  }
  function thud(){ const ac=getAC(); if(!ac||ac.state!=='running')return; const o=ac.createOscillator(), g=ac.createGain(); o.type='sine';
    const t=ac.currentTime; o.frequency.setValueAtTime(260,t); o.frequency.exponentialRampToValueAtTime(140,t+.22);
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(.10,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+.25);
    o.connect(g).connect(MASTER); o.start(t); o.stop(t+.27); }
  window.__bagAudio = { chime, thud, resume: resume };

  // ---------- PRICING ----------
  const PRICE_REFRESH_MS=15000, FETCH_TIMEOUT_MS=8000, LIVE_CACHE_TTL_MS=86400000, VIEW_CACHE_TTL_MS=21600000;
  const BAG_ISSUER='rNeYbfb9EDV8c7mNfUuooEEYYzMcEuDFbr', BAG_CODE='BAG';
  const PRICES=(window.__PRICES__={bagUsd:0,xrpUsd:0,source:'—',ts:0});
  function fmt(n){ return Number.isFinite(n)? n.toLocaleString(undefined,{maximumFractionDigits:6}):'—'; }
  function cacheSet(k,v){ try{ localStorage.setItem(k, JSON.stringify({t:Date.now(), v})); }catch{} }
  function cacheGet(k,ttl){ try{ const o=JSON.parse(localStorage.getItem(k)||'null'); if(!o) return null; return (Date.now()-(o.t||0))<=ttl?o.v:null; }catch{ return null; } }
  function timedFetch(url,opts={},timeout=FETCH_TIMEOUT_MS){
    const ctrl=new AbortController(); const id=setTimeout(()=>ctrl.abort(new Error('timeout')),timeout);
    try{ return fetch(url,{...opts,headers:{Accept:'application/json',...(opts.headers||{})},mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:ctrl.signal}); }
    finally{ setTimeout(()=>clearTimeout(id),0); }
  }
  function paintLiveLine(){
    const d=document; const liveDot=d.getElementById('liveDot'), liveBAG=d.getElementById('liveBAG'), liveXRP=d.getElementById('liveXRP'), liveNote=d.getElementById('liveNote'), liveConv=d.getElementById('liveConv');
    if(liveBAG) liveBAG.textContent=fmt(PRICES.bagUsd);
    if(liveXRP) liveXRP.textContent=Number.isFinite(PRICES.xrpUsd)? PRICES.xrpUsd.toFixed(2):'—';
    if(liveDot) liveDot.className=(PRICES.source==='live-amm'?'ok':PRICES.source==='last-live'?'warn':'err');
    if(liveNote) liveNote.textContent=(PRICES.source==='live-amm'?' (AMM live)':PRICES.source==='last-live'?' (last live)':' (unavailable)');
    if(liveConv){
      if(PRICES.bagUsd>0 && PRICES.xrpUsd>0){
        const xrpPerBag=PRICES.bagUsd/PRICES.xrpUsd, bagPerXrp=PRICES.xrpUsd/PRICES.bagUsd;
        liveConv.textContent=`1 BAG ≈ ${xrpPerBag.toLocaleString(undefined,{maximumFractionDigits:6})} XRP · 1 XRP ≈ ${bagPerXrp.toLocaleString(undefined,{maximumFractionDigits:6})} BAG`;
      } else liveConv.textContent='1 BAG ≈ — XRP · 1 XRP ≈ — BAG';
    }
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
  }
  async function fetchXrpUsdLive(){
    try{
      const r=await timedFetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
      if(!r.ok) throw 0; const v=(await r.json())?.ripple?.usd;
      if(Number(v)>0){ PRICES.xrpUsd=Number(v); cacheSet('xrp_usd',PRICES.xrpUsd); return true; }
    }catch{}
    return false;
  }
  function parseXrpAmount(a){ if(a==null) return null; if(typeof a==='string') return Number(a)/1_000_000; if(typeof a==='object'&&a.currency==='XRP') return Number(a.value); return null; }
  function parseIouAmount(a){ if(!a||typeof a!=='object') return null; return Number(a.value); }
  async function fetchBagViaAMMLive(){
    const req={id:1,command:'amm_info',asset:{currency:BAG_CODE,issuer:BAG_ISSUER},asset2:{currency:'XRP'}};
    const xrpPerBag=await new Promise(resolve=>{
      let ws; const t=setTimeout(()=>{ try{ws&&ws.close();}catch{} resolve(null); },8000);
      try{
        ws=new WebSocket('wss://s1.ripple.com');
        ws.onopen=()=>ws.send(JSON.stringify(req));
        ws.onerror=()=>{ clearTimeout(t); try{ws.close();}catch{} resolve(null); };
        ws.onmessage=ev=>{ try{
          const msg=JSON.parse(ev.data); if(msg.id!==1||!msg.result||!msg.result.amm) return;
          clearTimeout(t); try{ws.close();}catch{};
          const amm=msg.result.amm; const bagBal=parseIouAmount(amm.amount); const xrpBal=parseXrpAmount(amm.amount2);
          if(!(bagBal>0) || !(xrpBal>0)) return resolve(null);
          const price=xrpBal/bagBal; if(!(price>0) || !isFinite(price)) return resolve(null);
          resolve(price);
        }catch{ resolve(null); }};
      }catch{ clearTimeout(t); resolve(null); }
    });
    if(!(xrpPerBag>0)) return false; if(!(PRICES.xrpUsd>0)) return false;
    PRICES.bagUsd=PRICES.xrpUsd*xrpPerBag; PRICES.source='live-amm';
    cacheSet('bag_last_live_v1',{bagUsd:PRICES.bagUsd,xrpUsd:PRICES.xrpUsd}); cacheSet('bag_prices_v8',{bagUsd:PRICES.bagUsd,xrpUsd:PRICES.xrpUsd});
    return true;
  }
  function loadLast(){ const v=cacheGet('bag_last_live_v1',LIVE_CACHE_TTL_MS); if(v && Number(v.bagUsd)>0){ PRICES.bagUsd=+v.bagUsd; if(Number(v.xrpUsd)>0) PRICES.xrpUsd=+v.xrpUsd; PRICES.source='last-live'; return true; } return false; }
  function loadView(){ const v=cacheGet('bag_prices_v8',VIEW_CACHE_TTL_MS), x=cacheGet('xrp_usd',VIEW_CACHE_TTL_MS); let ok=false;
    if(v && Number(v.bagUsd)>0){ PRICES.bagUsd=+v.bagUsd; if(Number(v.xrpUsd)>0) PRICES.xrpUsd=+v.xrpUsd; ok=true; }
    if(!PRICES.xrpUsd && Number(x)>0){ PRICES.xrpUsd=+x; ok=true; }
    if(ok && PRICES.source==='—') PRICES.source='last-live'; return ok;
  }
  async function refreshPrices(){ const gotX=await fetchXrpUsdLive(); const gotB=await fetchBagViaAMMLive(); if(!(gotX&&gotB)){ if(!loadLast()) loadView(); } paintLiveLine(); }
  (async()=>{ await refreshPrices(); setInterval(refreshPrices, PRICE_REFRESH_MS); })();
  document.addEventListener('DOMContentLoaded', paintLiveLine);
  addEventListener('storage', (e)=>{ if(['bag_prices_v8','xrp_usd','bag_last_live_v1'].includes(e.key||'')){ if(!loadLast()) loadView(); paintLiveLine(); } });

  // ---------- DEMO SESSION ----------
  const DEMO_BAL_KEY='__bag_demo_bag_v2', DEMO_INIT_KEY='__bag_demo_init_v2', START_USD=2000;
  function PR(){ return window.__PRICES__||{bagUsd:0,xrpUsd:0}; }
  function fmtUsd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function getBag(){ try{ const n=Number(localStorage.getItem(DEMO_BAL_KEY)); return Number.isFinite(n)&&n>0?n:0; }catch{ return 0; } }
  function setBag(v){ try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{} }
  function getCachedBagUsd(){ try{
    const last=JSON.parse(localStorage.getItem('bag_last_live_v1')||'null'); if(last && Number(last.bagUsd)>0) return Number(last.bagUsd);
    const view=JSON.parse(localStorage.getItem('bag_prices_v8')||'null'); if(view && Number(view.bagUsd)>0) return Number(view.bagUsd);
  }catch{} return 0; }
  function ensureSeed(){ if(localStorage.getItem(DEMO_INIT_KEY)) return true; const live=Number(PR().bagUsd||0), cached=getCachedBagUsd(); const bagUsd= live>0?live:(cached>0?cached:0);
    if(bagUsd>0){ const start=START_USD/bagUsd; setBag(start); localStorage.setItem(DEMO_INIT_KEY,'1'); return true; } return false; }

  const demoSession={
    active:()=>true,
    get:()=>({addr:'demo', bag:getBag(), ts:Date.now()}),
    set:()=>{},
    spend(b){ const cur=getBag(); if(!(b>0)||cur<b) return false; setBag(cur-b); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); return true; },
    credit(b){ if(!(b>0)) return false; setBag(getBag()+b); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); return true; }
  };

  function renderPracticeBlock(){
    const el=document.getElementById('sessionStatus'); if(!el) return;
    const bag=getBag(), {bagUsd,xrpUsd}=PR(); const usd=(bagUsd>0)? bag*bagUsd : START_USD; const xrp=(bagUsd>0 && xrpUsd>0)? bag*(bagUsd/xrpUsd):0;
    const nf=n=>{ if(!Number.isFinite(n)) return '—'; if(Math.abs(n)>=1) return n.toLocaleString(undefined,{maximumFractionDigits:4});
      if(Math.abs(n)>=1e-2) return n.toLocaleString(undefined,{maximumFractionDigits:6});
      if(Math.abs(n)>=1e-4) return n.toLocaleString(undefined,{maximumFractionDigits:8}); return n.toLocaleString(undefined,{maximumFractionDigits:10}); };
    el.innerHTML=`<div class="practiceBlock">
      <div class="title" style="font-weight:800;margin-bottom:4px;">Practice:</div>
      <div class="line">BAG: <b style="color:#2fbf6b">${nf(bag)} BAG</b></div>
      <div class="line">XRP: <b style="color:#7cc7ff">${nf(xrp)} XRP</b></div>
      <div class="line">USD: <b>${fmtUsd(usd)}</b></div>
    </div>`;
  }

  function enableDemo(){
    try{ Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }catch{ window.__BAG_FORCE_DEMO=true; }
    window.__bagSession=demoSession;
    const seeded=ensureSeed(); renderPracticeBlock();
    const primary=document.querySelector('.btn-primary'); if(primary) primary.disabled=!seeded;
    addEventListener('bag:pricesUpdated', ()=>{ if(!localStorage.getItem(DEMO_INIT_KEY)){ const ok=ensureSeed(); if(ok && primary) primary.disabled=false; }
      renderPracticeBlock();
    });
    window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
  }

  // ---------- STAKE WIRE ----------
  const StakeWire = {
    init(cfg){
      const conf=Object.assign({
        usdInput:'#usdBet', qtyInput:'#betQty', currencyToggle:'#curToggle', unitLabels:'.unit',
        limitsLabel:'#betLimits', presetsRoot:'#usdPresets', minUsd:1, maxUsd:2000, activeClass:'active', syncOnPrice:true
      }, cfg||{});
      const d=document, usdEl=d.querySelector(conf.usdInput), qtyEl=d.querySelector(conf.qtyInput),
        curToggle=d.querySelector(conf.currencyToggle), unitEls=d.querySelectorAll(conf.unitLabels),
        limitsEl=d.querySelector(conf.limitsLabel), presets=d.querySelector(conf.presetsRoot);
      const STATE={lastEdited:'qty', lastCur:null, syncing:false};
      const PR=()=>window.__PRICES__||{bagUsd:0,xrpUsd:0};
      const getCur=()=>{ const el=curToggle?.querySelector('input[name="betCur"]:checked'); return el? String(el.value).toUpperCase():'XRP'; };
      const priceFor=cur=>{ const {bagUsd,xrpUsd}=PR(); return cur==='BAG'? bagUsd : xrpUsd; };
      const fmtUsd=n=>'$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
      function computeSessionMaxUsd(cur,minUsd,maxUsd){
        const sess=(window.__bagSession&&window.__bagSession.get&&window.__bagSession.get())||{}; const bagBal=Number(sess.bag)||0; let unitsAvail;
        if(cur==='BAG'){ unitsAvail=bagBal; } else { const {bagUsd,xrpUsd}=PR(); unitsAvail=(bagUsd>0&&xrpUsd>0)? (bagBal*(bagUsd/xrpUsd)):0; }
        const px=priceFor(cur); const usdAvail=(px>0&&unitsAvail>0)? unitsAvail*px : maxUsd; return Math.max(minUsd, Math.min(maxUsd, usdAvail));
      }
      function paintUnits(){ const cur=getCur(); unitEls.forEach(s=>s.textContent=cur); }
      function rUsd(){ const v=parseFloat(usdEl?.value||''); return Number.isFinite(v)&&v>0?v:0; }
      function rQty(){ const v=parseFloat(qtyEl?.value||''); return Number.isFinite(v)&&v>0?v:0; }
      function wUsd(u){ if(!usdEl)return; usdEl.value = u? (Math.round(u*100)/100).toFixed(2):''; }
      function wQty(q){ if(!qtyEl)return; const d=6; qtyEl.value = q? Number(q).toFixed(Math.min(6,d)).replace(/\.?0+$/,''):''; }
      function renderLimits(){ if(!limitsEl) return; const cur=getCur(), px=priceFor(cur), u=rUsd()||(rQty()*(px>0?px:0))||0;
        const warn=(u>0&&u<conf.minUsd)?` · <span style="color:#e8a85c">Min ${fmtUsd(conf.minUsd)}</span>`:(u>conf.maxUsd)?` · <span style="color:#e8a85c">Max ${fmtUsd(conf.maxUsd)}</span>`:''; 
        limitsEl.innerHTML=`Limits: ${fmtUsd(conf.minUsd)}–${fmtUsd(conf.maxUsd)} · Your stake ≈ ${fmtUsd(u||0)}${warn}`; }
      function syncFromUSD(){ if(STATE.syncing) return; STATE.syncing=true; const cur=getCur(), px=priceFor(cur), usd=rUsd();
        if(usd && px>0) wQty(usd/px); else if(!usd) wQty(''); renderLimits(); STATE.syncing=false; }
      function syncFromQty(){ if(STATE.syncing) return; STATE.syncing=true; const cur=getCur(), px=priceFor(cur), qty=rQty();
        if(qty && px>0) wUsd(qty*px); else if(!qty) wUsd(''); renderLimits(); STATE.syncing=false; }
      function convert(prev,next){ const pxPrev=priceFor(prev), pxNext=priceFor(next); let usd=rUsd(); const qPrev=rQty();
        if(!(usd>0)) usd=(qPrev>0&&pxPrev>0)? qPrev*pxPrev:0; if(usd>0&&pxNext>0){ wUsd(usd); wQty(usd/pxNext); } renderLimits(); }
      usdEl?.addEventListener('input', ()=>{ STATE.lastEdited='usd'; syncFromUSD(); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); });
      qtyEl?.addEventListener('input', ()=>{ STATE.lastEdited='qty'; syncFromQty(); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); });
      STATE.lastCur=getCur(); curToggle?.addEventListener('change', ()=>{ const prev=STATE.lastCur, next=getCur(); STATE.lastCur=next; paintUnits(); convert(prev,next); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); });
      if(conf.syncOnPrice){ addEventListener('bag:pricesUpdated', ()=>{ if(STATE.lastEdited==='usd') syncFromUSD(); else syncFromQty(); }); }
      if(presets){
        const setActive=btn=>{ presets.querySelectorAll('.preset-chip').forEach(b=>b.classList.remove(conf.activeClass)); btn&&btn.classList.add(conf.activeClass); };
        const applyUsd=usd=>{ wUsd(usd); STATE.lastEdited='usd'; syncFromUSD(); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); };
        const clamp=u=>Math.max(conf.minUsd, Math.min(conf.maxUsd, u||0));
        presets.querySelectorAll('button[data-usd]').forEach(btn=>{
          btn.addEventListener('click', ()=>{ const v=btn.getAttribute('data-usd'); let usd=0;
            usd = (v==='max') ? computeSessionMaxUsd(getCur(), conf.minUsd, conf.maxUsd) : (parseFloat(v)||0);
            usd=clamp(usd); setActive(btn); applyUsd(usd);
          });
        });
        const resync=()=>{ const btn=presets.querySelector('.'+conf.activeClass); if(!btn) return; const v=btn.getAttribute('data-usd');
          if(v==='max'){ applyUsd(computeSessionMaxUsd(getCur(), conf.minUsd, conf.maxUsd)); } else { applyUsd(parseFloat(v)||0); } };
        addEventListener('bag:pricesUpdated', resync); curToggle?.addEventListener('change', resync);
      }
      paintUnits(); if(rUsd()>0){ STATE.lastEdited='usd'; syncFromUSD(); } else { STATE.lastEdited='qty'; syncFromQty(); } renderLimits();
    }
  };
  window.BAGStakeWire = StakeWire;

  // ---------- HUD ----------
  function fmtNum(n,max=6){ const x=Number(n); if(!Number.isFinite(x)) return '—'; return x.toLocaleString(undefined,{maximumFractionDigits:max}); }
  function currentCurrency(){ const el=document.querySelector('#curToggle input[name="betCur"]:checked'); return el? String(el.value).toUpperCase():'XRP'; }
  function balances(){
    const sess=(window.__bagSession&&window.__bagSession.get&&window.__bagSession.get())||{}; const bag=Number(sess.bag)||0; let xrp=Number(sess.xrp);
    const {bagUsd,xrpUsd}=PR(); if(!(xrp>0)){ if(bagUsd>0 && xrpUsd>0) xrp=bag*(bagUsd/xrpUsd); else xrp=0; }
    return {bag,xrp};
  }
  function renderHud(){
    try{
      const balLbl=document.getElementById('balLbl'), ccyLbl=document.getElementById('ccyLbl'),
            betLbl=document.getElementById('betLbl'), modeLbl=document.getElementById('modeLbl'), lastLbl=document.getElementById('lastLbl'),
            betQtyEl=document.getElementById('betQty');
      const mode=(window.__BAG_FORCE_DEMO===true)?'Demo':'Live', ccy=currentCurrency(), {bag,xrp}=balances(), bet=parseFloat(betQtyEl?.value||'0')||0;
      if(modeLbl) modeLbl.textContent=mode; if(betLbl) betLbl.textContent=fmtNum(bet,6); if(lastLbl) lastLbl.textContent=String(window.__BAG_LAST__||'—');
      if(balLbl && ccyLbl){ if(ccy==='XRP'){ balLbl.textContent=fmtNum(xrp,6); ccyLbl.textContent='XRP'; } else { balLbl.textContent=fmtNum(bag,6); ccyLbl.textContent='BAG'; } }
    }catch{}
  }
  ['bag:sessionStarted','bag:sessionToppedUp','bag:sessionEnded','bag:pricesUpdated','bag:walletConnected','bag:walletDisconnected','bag:hudRefresh']
    .forEach(ev=>addEventListener(ev,renderHud));
  document.getElementById('betQty')?.addEventListener('input',renderHud);
  document.getElementById('curToggle')?.addEventListener('change',renderHud);
  addEventListener('storage',(e)=>{ if(e && e.key==='__bag_demo_bag_v2') renderHud(); });
  setTimeout(renderHud,0);

  // ---------- RULES MODAL ----------
  function wireRules(){
    const fab=document.getElementById('rulesFab'), ov=document.getElementById('rulesOverlay'), x=document.getElementById('rulesClose');
    function open(){ ov && (ov.style.display='grid'); } function close(){ ov && (ov.style.display='none'); }
    fab?.addEventListener('click', open); x?.addEventListener('click', close); ov?.addEventListener('click', e=>{ if(e.target===ov) close(); });
    addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  }

  // ---------- PUBLIC INIT ----------
  window.BAGFrame = {
    init(opts){
      // opts: { demo:true, stake:{...}, rules:{title, html, note} }
      if(opts?.demo!==false) enableDemo(); else { window.__BAG_FORCE_DEMO=false; }
      StakeWire.init(Object.assign({
        usdInput:'#usdBet', qtyInput:'#betQty', currencyToggle:'#curToggle', unitLabels:'.unit',
        limitsLabel:'#betLimits', presetsRoot:'#usdPresets', minUsd:1, maxUsd:2000, activeClass:'active', syncOnPrice:true
      }, opts?.stake||{}));

      // Win readout placeholder init is game-specific. Provide a simple default labeler.
      const WR = {
        el: document.getElementById('bag-win-readout'),
        state:{ stakeBag:0, usdPerBag:0, labels: opts?.readout?.labels || [] }
      };
      function amt(bag, usdPerBag){ const usd=(bag||0)*(usdPerBag||0);
        const nfBAG=new Intl.NumberFormat('en-US',{maximumFractionDigits:6});
        const nfUSD=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
        return `${nfBAG.format(bag||0)} BAG (${nfUSD.format(usd)})`;
      }
      function repaintReadout(){
        if(!WR.el) return; const bagUsd = (window.__PRICES__||{}).bagUsd || 0;
        const rows = (WR.state.labels.length? WR.state.labels : [
          ['Example Win 1.00×', 1.00],
          ['Jackpot 2.00×', 2.00],
          ['Loss', 0.00]
        ]).map(([label,m])=>`<div class="row"><div>${label}:</div><div>${amt(WR.state.stakeBag*m, bagUsd)}</div></div>`).join('');
        WR.el.innerHTML = `<div class="row"><div class="title">PAYOUT PREVIEW:</div><div></div></div>${rows}<div class="note">Preview updates with stake and live price</div>`;
      }
      window.BAGWinReadout = {
        updateStake(b){ WR.state.stakeBag = Number(b)||0; repaintReadout(); },
        setLabels(labels){ WR.state.labels = labels||[]; repaintReadout(); }
      };
      addEventListener('bag:pricesUpdated', repaintReadout);
      addEventListener('bag:hudRefresh', ()=>{ // recompute from current inputs if present
        const cur=document.querySelector('#curToggle input[name="betCur"]:checked')?.value?.toUpperCase() || 'XRP';
        const q=parseFloat(document.getElementById('betQty')?.value||0)||0;
        const {bagUsd,xrpUsd}=PR();
        const stakeBag = cur==='BAG' ? q : (bagUsd>0&&xrpUsd>0? q*(xrpUsd/bagUsd):0);
        WR.state.stakeBag=stakeBag; repaintReadout();
      });
      repaintReadout();

      wireRules();
      setTimeout(renderHud, 0);
    }
  };
})();
