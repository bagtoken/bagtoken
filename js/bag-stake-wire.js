<script>
(function(global){
  const PR = ()=>global.__PRICES__ || { bagUsd:0, xrpUsd:0 };

  function getCur(toggle){
    const el = toggle?.querySelector('input[name="betCur"]:checked');
    return el ? String(el.value).toUpperCase() : 'XRP';
  }
  function priceFor(cur){ const {bagUsd,xrpUsd}=PR(); return cur==='BAG'?bagUsd:xrpUsd; }
  function fmtUsd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function computeSessionMaxUsd(cur, minUsd, maxUsd){
    const sess = (global.__bagSession && global.__bagSession.get && global.__bagSession.get()) || {};
    const bagBal = Number(sess.bag)||0;
    let unitsAvail = (cur==='BAG') ? bagBal : ((PR().bagUsd>0 && PR().xrpUsd>0) ? bagBal*(PR().bagUsd/PR().xrpUsd) : 0);
    const px = priceFor(cur);
    const usdAvail = (px>0 && unitsAvail>0) ? unitsAvail*px : maxUsd;
    return Math.max(minUsd, Math.min(maxUsd, usdAvail));
  }

  function init(opts){
    const cfg=Object.assign({
      usdInput:'#usdBet', qtyInput:'#betQty', currencyToggle:'#curToggle',
      unitLabels:'.unit', limitsLabel:'#betLimits', presetsRoot:'#usdPresets',
      minUsd:1, maxUsd:2000, activeClass:'active', syncOnPrice:true
    }, opts||{});

    const usdEl=document.querySelector(cfg.usdInput);
    const qtyEl=document.querySelector(cfg.qtyInput);
    const curToggle=document.querySelector(cfg.currencyToggle);
    const unitEls=document.querySelectorAll(cfg.unitLabels);
    const limitsEl=document.querySelector(cfg.limitsLabel);
    const presets=document.querySelector(cfg.presetsRoot);

    const STATE={lastEdited:'qty', lastCur:null, syncing:false};

    function paintUnits(){ const c=getCur(curToggle); unitEls.forEach(s=> s.textContent=c); }
    function readUsd(){ const v=parseFloat(usdEl?.value||''); return Number.isFinite(v)&&v>0?v:0; }
    function readQty(){ const v=parseFloat(qtyEl?.value||''); return Number.isFinite(v)&&v>0?v:0; }
    function writeUsd(u){ if(!usdEl) return; usdEl.value = u ? (Math.round(u*100)/100).toFixed(2) : ''; }
    function writeQty(q){ if(!qtyEl) return; const d=6; qtyEl.value = q ? Number(q).toFixed(Math.min(6,d)).replace(/\.?0+$/,'') : ''; }

    function renderLimits(){
      if(!limitsEl) return;
      const cur=getCur(curToggle), px=priceFor(cur);
      const u = readUsd() || (readQty()*(px>0?px:0)) || 0;
      let warn='';
      if(u>0 && u<cfg.minUsd) warn=` · <span style="color:#e8a85c">Min ${fmtUsd(cfg.minUsd)}</span>`;
      else if(u>cfg.maxUsd)  warn=` · <span style="color:#e8a85c">Max ${fmtUsd(cfg.maxUsd)}</span>`;
      limitsEl.innerHTML = `Limits: ${fmtUsd(cfg.minUsd)}–${fmtUsd(cfg.maxUsd)} · Your stake ≈ ${fmtUsd(u||0)}${warn}`;
    }

    function syncFromUSD(){
      if(STATE.syncing) return; STATE.syncing=true;
      const cur=getCur(curToggle), px=priceFor(cur), usd=readUsd();
      if (usd && px>0){ writeQty(usd/px); } else if(!usd){ writeQty(''); }
      renderLimits(); STATE.syncing=false;
    }
    function syncFromQty(){
      if(STATE.syncing) return; STATE.syncing=true;
      const cur=getCur(curToggle), px=priceFor(cur), qty=readQty();
      if (qty && px>0){ writeUsd(qty*px); } else if(!qty){ writeUsd(''); }
      renderLimits(); STATE.syncing=false;
    }
    function convertOnCurrencyChange(prev,next){
      const pxPrev=priceFor(prev), pxNext=priceFor(next);
      let usd=readUsd(); const qtyPrev=readQty();
      if(!(usd>0)) usd = (qtyPrev>0 && pxPrev>0) ? qtyPrev*pxPrev : 0;
      if(usd>0 && pxNext>0){ writeUsd(usd); writeQty(usd/pxNext); }
      renderLimits();
    }

    usdEl?.addEventListener('input', ()=>{ STATE.lastEdited='usd'; syncFromUSD(); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); });
    qtyEl?.addEventListener('input', ()=>{ STATE.lastEdited='qty'; syncFromQty(); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); });

    STATE.lastCur = getCur(curToggle);
    curToggle?.addEventListener('change', ()=>{
      const prev=STATE.lastCur, next=getCur(curToggle); STATE.lastCur=next;
      paintUnits(); convertOnCurrencyChange(prev,next);
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
    });

    if (cfg.syncOnPrice){
      addEventListener('bag:pricesUpdated', ()=>{ (STATE.lastEdited==='usd')?syncFromUSD():syncFromQty(); });
    }

    if (presets){
      const setActive = (btn)=>{ presets.querySelectorAll('.preset-chip').forEach(b=>b.classList.remove(cfg.activeClass)); btn && btn.classList.add(cfg.activeClass); };
      const clampUsd = (u)=> Math.max(cfg.minUsd, Math.min(cfg.maxUsd, u||0));
      const applyUsd = (usd)=>{ writeUsd(usd); STATE.lastEdited='usd'; syncFromUSD(); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); };

      presets.querySelectorAll('button[data-usd]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const val = btn.getAttribute('data-usd');
          let usd = (val==='max') ? computeSessionMaxUsd(getCur(curToggle), cfg.minUsd, cfg.maxUsd) : parseFloat(val)||0;
          usd = clampUsd(usd); setActive(btn); applyUsd(usd);
        });
      });

      const resyncActive = ()=>{
        const btn=presets.querySelector('.'+cfg.activeClass); if(!btn) return;
        const v=btn.getAttribute('data-usd');
        const usd=(v==='max')?computeSessionMaxUsd(getCur(curToggle),cfg.minUsd,cfg.maxUsd):parseFloat(v)||0;
        applyUsd(Math.max(cfg.minUsd,Math.min(cfg.maxUsd,usd)));
      };
      addEventListener('bag:pricesUpdated', resyncActive);
      curToggle?.addEventListener('change', resyncActive);
    }

    paintUnits(); (readUsd()>0 ? (STATE.lastEdited='usd',syncFromUSD()) : (STATE.lastEdited='qty',syncFromQty())); renderLimits();
  }

  global.BAGStakeWire = { init };
})(window);
</script>
