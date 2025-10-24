<script>
/* BAG Events + helpers */
(function(w){
  const E = new EventTarget();
  const on  = (n,fn)=>E.addEventListener(n,fn);
  const off = (n,fn)=>E.removeEventListener(n,fn);
  const emit= (n,detail)=>E.dispatchEvent(new CustomEvent(n,{detail}));

  const _PRICES = (w.__PRICES__ = w.__PRICES__ || { bagUsd:0, xrpUsd:0, source:'—', ts:0 });
  const PR = ()=>_PRICES;

  // Small utils shared everywhere
  const fmtUsd = (n)=>'$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtQty = (x=>{
    return (n)=>{
      const v=Number(n)||0;
      if (Math.abs(v)>=1)  return v.toLocaleString(undefined,{maximumFractionDigits:6});
      if (Math.abs(v)>=1e-2) return v.toLocaleString(undefined,{maximumFractionDigits:8});
      return v.toLocaleString(undefined,{maximumFractionDigits:10});
    };
  })();

  w.BAG = Object.assign(w.BAG||{}, { on, off, emit, PR, fmtUsd, fmtQty });
})(window);
</script>
