/*!
 * BAGPayoutWire — mirrors Dice payout preview wiring
 * - Reads stake from #usdBet / #betQty and currency toggle #curToggle
 * - Uses window.__PRICES__ (bagUsd, xrpUsd)
 * - Repaints on input/change, bag:pricesUpdated, bag:hudRefresh
 *
 * Usage:
 *   <script src="/js/bag-payout-wire.js"></script>
 *   BAGPayoutWire.init({
 *     usdInput:'#usdBet', qtyInput:'#betQty', currencyToggle:'#curToggle',
 *     rows:[
 *       { el:'#payWinComeOut', mult:1.25 },
 *       { el:'#payWinPoint',   mult:1.00 },
 *       { el:'#payJackpot',    mult:2.00 },
 *       { el:'#payLose',       mult:0.00, zeroText:'0 BAG ($0.00)' },
 *       { el:'#payHold',       kind:'hold' } // shows "Stake held"
 *     ]
 *   });
 */
(function(global){
  function PR(){ return global.__PRICES__ || { bagUsd:0, xrpUsd:0 }; }
  function $(s){ return document.querySelector(s); }
  function fmtUsd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtBag(n){ const x=Number(n)||0; return x.toLocaleString(undefined,{maximumFractionDigits:6}); }

  function currentCurrency(curToggle){
    const el = curToggle?.querySelector('input[name="betCur"]:checked');
    return el ? String(el.value).toUpperCase() : 'XRP';
  }
  function readStakeUSD(usdEl, qtyEl, curToggle){
    const direct = parseFloat(usdEl?.value||'');
    if (Number.isFinite(direct) && direct>0) return direct;
    const q = parseFloat(qtyEl?.value||'')||0;
    const { bagUsd, xrpUsd } = PR();
    if (currentCurrency(curToggle)==='BAG') return (bagUsd>0) ? q*bagUsd : 0;
    return (xrpUsd>0) ? q*xrpUsd : 0;
  }
  function readStakeBAG(qtyEl, curToggle){
    const q = parseFloat(qtyEl?.value||'')||0;
    const { bagUsd, xrpUsd } = PR();
    if (currentCurrency(curToggle)==='BAG') return q;
    if (bagUsd>0 && xrpUsd>0) return q * (xrpUsd/bagUsd);
    return 0;
  }

  function init(opts){
    const cfg = Object.assign({
      usdInput:'#usdBet',
      qtyInput:'#betQty',
      currencyToggle:'#curToggle',
      rows:[] // [{el:'#id', mult:Number} | {el:'#id', kind:'hold'}]
    }, opts||{});

    const usdEl = $(cfg.usdInput);
    const qtyEl = $(cfg.qtyInput);
    const curTg = $(cfg.currencyToggle);

    function paint(){
      const sUsd = readStakeUSD(usdEl, qtyEl, curTg);
      const sBag = readStakeBAG(qtyEl, curTg);

      cfg.rows.forEach(row=>{
        const out = $(row.el); if(!out) return;
        if (row.kind === 'hold'){
          out.textContent = (sBag>0 && sUsd>0) ? 'Stake held' : '—';
          return;
        }
        const m = Number(row.mult)||0;
        if (!(sBag>0 && sUsd>0)){
          out.textContent = (m===0 && row.zeroText) ? row.zeroText : '—';
          return;
        }
        if (m===0){
          out.textContent = row.zeroText || '0 BAG ($0.00)';
          return;
        }
        out.textContent = `${fmtBag(sBag*m)} BAG (${fmtUsd(sUsd*m)})`;
      });
    }

    // repaint on anything that can change stake/price
    ['input','change'].forEach(ev=>{
      usdEl?.addEventListener(ev, paint);
      qtyEl?.addEventListener(ev, paint);
      curTg?.addEventListener(ev, paint);
    });
    addEventListener('bag:pricesUpdated', paint);
    addEventListener('bag:hudRefresh', paint);

    paint();
    return { update: paint };
  }

  global.BAGPayoutWire = { init };
})(window);
