<script>
(function(w){
  const { PR, emit, fmtUsd } = w.BAG;

  function getCur(root){
    const el = root?.querySelector('input[name="betCur"]:checked');
    return el ? String(el.value).toUpperCase() : 'XRP';
  }
  const priceFor=(cur)=>{ const {bagUsd,xrpUsd}=PR(); return cur==='BAG'?bagUsd:xrpUsd; };

  function computeSessionMaxUsd(cur, minUsd, maxUsd){
    const sess=(w.__bagSession && w.__bagSession.get && w.__bagSession.get())||{};
    const bagBal=Number(sess.bag)||0;
    const {bagUsd,xrpUsd}=PR();
    const units = cur==='BAG' ? bagBal : ((bagUsd>0&&xrpUsd>0)? bagBal*(bagUsd/xrpUsd) : 0);
    const px=priceFor(cur); const usdAvail=(px>0&&units>0)? units*px : maxUsd;
    return Math.max(minUsd, Math.min(maxUsd, usdAvail));
  }

  function init(cfg){
    const opt=Object.assign({
      usdInput:'#usdBet', qtyInput:'#betQty', currencyToggle:'#curToggle',
      unitLabels:'.unit', limitsLabel:'#betLimits', presetsRoot:'#usdPresets',
      minUsd:1, maxUsd:2000, activeClass:'active', syncOnPrice:true
    }, cfg||{});

    const usdEl=document.querySelector(opt.usdInput);
    const qtyEl=document.querySelector(opt.qtyInput);
    const curT =document.querySelector(opt.currencyToggle);
    const unitsEls=document.querySelectorAll(opt.unitLabels);
    const limitsEl=document.querySelector(opt.limitsLabel);
    const presets=document.querySelector(opt.presetsRoot);

    const S={ lastEdited:'qty', lastCur:null, syncing:false };
    const readUsd = ()=>{ const v=parseFloat(usdEl?.value||''); return Number.isFinite(v)&&v>0?v:0; };
    const readQty = ()=>{ const v=parseFloat(qtyEl?.value||''); return Number.isFinite(v)&&v>0?v:0; };
    const writeUsd= (u)=>{ if(!usdEl) return; usdEl.value = u ? (Math.round(u*100)/100).toFixed(2) : ''; };
    const writeQty= (q)=>{ if(!qtyEl) return; const d=6; qtyEl.value = q ? Number(q).toFixed(Math.min(6,d)).replace(/\.?0+$/,'') : ''; };
    const paintUnits= ()=>{ const c=getCur(curT); unitsEls.forEach(el=>el.textContent=c); };
    function renderLimits(){
      if (!limitsEl) return;
      const c=getCur(curT), px=priceFor(c);
      const u = readUsd() || (readQty()*(px>0?px:0)) || 0;
      const warn = (u>0 && u<opt.minUsd) ? ` · <span style="color:#e8a85c">Min ${fmtUsd(opt.minUsd)}</span>` :
                   (u>opt.maxUsd) ? ` · <span style="color:#e8a85c">Max ${fmtUsd(opt.maxUsd)}</span>` : '';
      limitsEl.innerHTML = `Limits: ${fmtUsd(opt.minUsd)}–${fmtUsd(opt.maxUsd)} · Your stake ≈ ${fmtUsd(u||0)}${warn}`;
    }
    function syncFromUSD(){
      if(S.syncing) return; S.syncing=true;
      const px=priceFor(getCur(curT)); const usd=readUsd();
      if(usd && px>0){ writeQty(usd/px); } else if(!usd){ writeQty(''); }
      renderLimits(); S.syncing=false;
    }
    function syncFromQty(){
      if(S.syncing) return; S.syncing=true;
      const px=priceFor(getCur(curT)); const qty=readQty();
      if(qty && px>0){ writeUsd(qty*px); } else if(!qty){ writeUsd(''); }
      renderLimits(); S.syncing=false;
    }
    function convertOnCur(prev,next){
      const pxPrev=priceFor(prev), pxNext=priceFor(next);
      let usd=readUsd(); const qtyPrev=readQty();
      if(!(usd>0)) usd=(qtyPrev>0 && pxPrev>0)? qtyPrev*pxPrev : 0;
      if(usd>0 && pxNext>0){ writeUsd(usd); writeQty(usd/pxNext); }
      renderLimits();
    }

    usdEl?.addEventListener('input', ()=>{ S.lastEdited='usd'; syncFromUSD(); w.BAG.emit('bag:hudRefresh'); });
    qtyEl?.addEventListener('input', ()=>{ S.lastEdited='qty'; syncFromQty(); w.BAG.emit('bag:hudRefresh'); });

    S.lastCur=getCur(curT);
    curT?.addEventListener('change', ()=>{ const prev=S.lastCur; const next=getCur(curT); S.lastCur=next; paintUnits(); convertOnCur(prev,next); emit('bag:hudRefresh'); });

    if (opt.syncOnPrice){
      addEventListener('bag:pricesUpdated', ()=>{ (S.lastEdited==='usd')?syncFromUSD():syncFromQty(); });
    }

    // Presets (coexists with /js/bag-quick-amounts.js)
    if(presets){
      const setActive=(btn)=>{ presets.querySelectorAll('.preset-chip').forEach(b=>b.classList.remove(opt.activeClass)); btn&&btn.classList.add(opt.activeClass); };
      const applyUsd=(usd)=>{ writeUsd(usd); S.lastEdited='usd'; syncFromUSD(); emit('bag:hudRefresh'); };
      const clampUsd=(u)=>Math.max(opt.minUsd, Math.min(opt.maxUsd, u||0));

      presets.querySelectorAll('button[data-usd]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const val=btn.getAttribute('data-usd'); let usd=0;
          if(val==='max') usd=computeSessionMaxUsd(getCur(curT), opt.minUsd, opt.maxUsd);
          else usd=parseFloat(val)||0;
          usd=clampUsd(usd); setActive(btn); applyUsd(usd);
        });
      });

      const resyncActive=()=>{
        const btn=presets.querySelector('.'+opt.activeClass); if(!btn) return;
        const v=btn.getAttribute('data-usd');
        if(v==='max') applyUsd(clampUsd(computeSessionMaxUsd(getCur(curT), opt.minUsd, opt.maxUsd)));
        else applyUsd(clampUsd(parseFloat(v)||0));
      };
      addEventListener('bag:pricesUpdated', resyncActive);
      curT?.addEventListener('change', resyncActive);
    }

    paintUnits();
    if((parseFloat(usdEl?.value||'')||0)>0){ S.lastEdited='usd'; syncFromUSD(); } else { S.lastEdited='qty'; syncFromQty(); }
    renderLimits();
  }

  w.BAG = Object.assign(w.BAG||{}, { stakeWire:{ init }});
})(window);
</script>
