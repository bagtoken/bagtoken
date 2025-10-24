<script>
(function(w){
  const { emit, PR } = w.BAG;

  const PRICE_REFRESH_MS = 15000;
  const FETCH_TIMEOUT_MS = 8000;
  const LIVE_CACHE_TTL   = 24*60*60*1000;
  const VIEW_CACHE_TTL   = 6*60*60*1000;

  const BAG_ISSUER = 'rNeYbfb9EDV8c7mNfUuooEEYYzMcEuDFbr';
  const BAG_CODE = 'BAG';

  const VIEW_CACHE_KEY = 'bag_prices_v8';
  const LAST_LIVE_KEY  = 'bag_last_live_v1';
  const XRP_KEY        = 'xrp_usd';

  const timedFetch=(url,opts={},timeout=FETCH_TIMEOUT_MS)=>{
    const ctrl=new AbortController();
    const id=setTimeout(()=>ctrl.abort(new Error('timeout')),timeout);
    return fetch(url,{...opts,headers:{Accept:'application/json',...(opts.headers||{})},mode:'cors',cache:'no-store',signal:ctrl.signal})
      .finally(()=>clearTimeout(id));
  };

  const cacheSet=(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify({t:Date.now(), v})); }catch{} };
  const cacheGet=(k,ttl)=>{ try{
    const o=JSON.parse(localStorage.getItem(k)||'null'); if(!o) return null;
    return (Date.now()-(o.t||0))<=ttl ? o.v : null;
  }catch{ return null; }};

  const parseXrpAmount=a=>a==null?null:(typeof a==='string'?Number(a)/1_000_000:(a.currency==='XRP'?Number(a.value):null));
  const parseIouAmount=a=>!a||typeof a!=='object'?null:Number(a.value);

  async function fetchXrpUsd(){
    try{
      const r=await timedFetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
      if(!r.ok) throw 0;
      const v=(await r.json())?.ripple?.usd;
      if(Number(v)>0){ PR().xrpUsd=Number(v); cacheSet(XRP_KEY, PR().xrpUsd); return true; }
    }catch{}
    return false;
  }

  async function fetchBagUsdViaAMM(){
    const req={ id:1, command:'amm_info', asset:{currency:BAG_CODE,issuer:BAG_ISSUER}, asset2:{currency:'XRP'} };
    const xrpPerBag=await new Promise((resolve)=>{
      const ws=new WebSocket('wss://s1.ripple.com'); const t=setTimeout(()=>{ try{ws.close();}catch{}; resolve(null); },8000);
      ws.onopen=()=>ws.send(JSON.stringify(req));
      ws.onerror=()=>{ clearTimeout(t); resolve(null); try{ws.close();}catch{}; };
      ws.onmessage=ev=>{
        try{
          const m=JSON.parse(ev.data); if(m.id!==1||!m.result||!m.result.amm) return;
          clearTimeout(t); try{ws.close();}catch{};
          const bagBal=parseIouAmount(m.result.amm.amount);
          const xrpBal=parseXrpAmount(m.result.amm.amount2);
          if(!(bagBal>0&&xrpBal>0)) return resolve(null);
          const p=xrpBal/bagBal; resolve(p>0&&isFinite(p)?p:null);
        }catch{ resolve(null); }
      };
    });
    if(!(xrpPerBag>0) || !(PR().xrpUsd>0)) return false;
    PR().bagUsd = PR().xrpUsd * xrpPerBag;
    PR().source = 'live-amm';
    cacheSet(LAST_LIVE_KEY,{bagUsd:PR().bagUsd,xrpUsd:PR().xrpUsd});
    cacheSet(VIEW_CACHE_KEY,{bagUsd:PR().bagUsd,xrpUsd:PR().xrpUsd});
    return true;
  }

  function fallbackFromCache(){
    const last=cacheGet(LAST_LIVE_KEY, LIVE_CACHE_TTL);
    const view=cacheGet(VIEW_CACHE_KEY, VIEW_CACHE_TTL);
    const x=cacheGet(XRP_KEY, VIEW_CACHE_TTL);
    let ok=false;
    if(last && Number(last.bagUsd)>0){ PR().bagUsd=Number(last.bagUsd); if(Number(last.xrpUsd)>0) PR().xrpUsd=Number(last.xrpUsd); PR().source='last-live'; ok=true; }
    else if(view && Number(view.bagUsd)>0){ PR().bagUsd=Number(view.bagUsd); if(Number(view.xrpUsd)>0) PR().xrpUsd=Number(view.xrpUsd); PR().source='last-live'; ok=true; }
    if(!PR().xrpUsd && Number(x)>0){ PR().xrpUsd=Number(x); ok=true; }
    return ok;
  }

  async function refresh(){
    const gotX = await fetchXrpUsd();
    const gotB = await fetchBagUsdViaAMM();
    if(!gotX || !gotB){ fallbackFromCache(); }
    emit('bag:pricesUpdated', { ...PR() });
  }

  (async()=>{ await refresh(); setInterval(refresh, 15000); })();

  addEventListener('storage', (e)=>{
    if([VIEW_CACHE_KEY, XRP_KEY, LAST_LIVE_KEY].includes(e.key)){ fallbackFromCache(); emit('bag:pricesUpdated', { ...PR() }); }
  });
})(window);
</script>
