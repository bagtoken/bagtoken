<script>
(function(w){
  const { PR, on, fmtUsd, fmtQty } = w.BAG;

  function mount(opts){
    const cfg=Object.assign({
      qtyInput:'#betQty', usdInput:'#usdBet', curToggle:'#curToggle',
      targets:{
        winComeOut:'#payWinComeOut',
        winPoint  :'#payWinPoint',
        jackpot   :'#payJackpot',
        lose      :'#payLose',
        hold      :'#payHold'
      },
      multipliers:{ comeOut:1.25, point:1.00, jackpot:2.00 }
    }, opts||{});

    const $=(s)=>document.querySelector(s);
    const qtyEl=$(cfg.qtyInput), usdEl=$(cfg.usdInput), curT=$(cfg.curToggle);
    const T={
      co:$(cfg.targets.winComeOut),
      pt:$(cfg.targets.winPoint),
      jp:$(cfg.targets.jackpot),
      lo:$(cfg.targets.lose),
      ho:$(cfg.targets.hold),
    };

    const cur=()=>{ const r=curT?.querySelector('input[name="betCur"]:checked'); return r?String(r.value).toUpperCase():'XRP'; };
    const n=(v)=>{ const x=parseFloat(v||''); return Number.isFinite(x)&&x>0?x:0; };

    function stakeBAG(){
      const {bagUsd,xrpUsd}=PR();
      const qty=n(qtyEl?.value);
      if(!qty) return 0;
      return cur()==='BAG' ? qty : ((bagUsd>0&&xrpUsd>0)? qty*(xrpUsd/bagUsd) : 0);
    }

    function paint(){
      const bag = stakeBAG();
      const px  = PR().bagUsd||0;
      const vCO = bag * cfg.multipliers.comeOut;
      const vPT = bag * cfg.multipliers.point;
      const vJP = bag * cfg.multipliers.jackpot;

      if(T.co) T.co.textContent = `${fmtQty(vCO)} BAG (${fmtUsd(vCO*px)})`;
      if(T.pt) T.pt.textContent = `${fmtQty(vPT)} BAG (${fmtUsd(vPT*px)})`;
      if(T.jp) T.jp.textContent = `${fmtQty(vJP)} BAG (${fmtUsd(vJP*px)})`;
      if(T.lo) T.lo.textContent = `0 BAG (${fmtUsd(0)})`;
      if(T.ho) T.ho.textContent = `Stake held`;
    }

    ['input','change'].forEach(ev=>{ qtyEl?.addEventListener(ev, paint); usdEl?.addEventListener(ev, paint); curT?.addEventListener('change', paint); });
    on('bag:pricesUpdated', paint); on('bag:hudRefresh', paint);
    paint(); setTimeout(paint,300);
  }

  w.BAG = Object.assign(w.BAG||{}, { payouts:{ mount }});
})(window);
</script>
