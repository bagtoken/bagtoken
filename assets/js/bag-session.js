<!-- /js/bag-session.js -->
<script>
(() => {
  // ---- Config ----
  const TREASURY = 'rNeYbfb9EDV8c7mNfUuooEEYYzMcEuDFbr';
  const XUMM_API_KEY = '48d8a5b2-0f90-4c5a-b5c2-3d7c8fd6113f';
  const WALLET_KEY   = 'bag_wallet_v1';
  const SESSION_KEY  = 'bag_session_v1';
  const DEMO_KEY     = '__bag_demo_bag_v1';
  const PRICES = (window.__PRICES__ = window.__PRICES__ || { bagUsd:0, xrpUsd:0 });

  // ---- Helpers ----
  const $ev = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const readWallet  = () => { try { return JSON.parse(localStorage.getItem(WALLET_KEY)||'null'); } catch { return null; } };
  const writeWallet = (w)  => { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch {} };
  const clearWallet = ()   => { try { localStorage.removeItem(WALLET_KEY); } catch {} };

  const readSession  = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); } catch { return null; } };
  const writeSession = (s)  => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); bc?.postMessage({type:'sync', payload:s}); } catch {} };
  const clearSession = ()   => { try { localStorage.removeItem(SESSION_KEY); bc?.postMessage({type:'sync', payload:null}); } catch {} };

  // Cross-tab sync
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('bag_session') : null;
  bc && (bc.onmessage = (e) => {
    if (e?.data?.type === 'sync') {
      // Accept the latest state from other tabs
      if (e.data.payload == null) clearSession(); else writeSession(e.data.payload);
      $ev('bag:sessionSynced', { from: 'bc' });
    }
  });

  // ---- Public PRICES updater (optional: wire your existing fetch code elsewhere) ----
  window.__bagPricesUpdate = function updatePrices({ bagUsd, xrpUsd, source }){
    if (bagUsd>0) PRICES.bagUsd = bagUsd;
    if (xrpUsd>0) PRICES.xrpUsd = xrpUsd;
    if (source) PRICES.source = source;
    $ev('bag:pricesUpdated');
  };

  // ---- Xumm (Xaman) connect ----
  let xumm = null, sdkReady = false;
  function ensureXumm(){
    if (sdkReady) return true;
    if (typeof window.Xumm === 'function'){
      xumm = new Xumm(XUMM_API_KEY);
      sdkReady = true;
      xumm.on('success', () => {
        const acct = xumm?.user?.account || null;
        if (acct) {
          writeWallet({ address: String(acct), ts: Date.now(), kind:'xaman' });
          $ev('bag:walletConnected', { address: acct });
        }
      });
      return true;
    }
    return false;
  }

  async function connectWallet(){
    if (!ensureXumm()) throw new Error('Xaman SDK not loaded yet');
    const auth = await xumm.authorize();
    const acct = (xumm && xumm.user && xumm.user.account) || auth?.me?.account;
    if (!acct) throw new Error('No account returned');
    writeWallet({ address: String(acct), ts: Date.now(), kind:'xaman' });
    $ev('bag:walletConnected', { address: acct });
    return String(acct);
  }

  function disconnectWallet(){
    clearWallet();
    $ev('bag:walletDisconnected');
  }

  // ---- XRPL Payment wait (utility) ----
  function waitForTx(txid, timeoutMs=60000){
    return new Promise(resolve=>{
      const ws = new WebSocket('wss://s1.ripple.com');
      const to = setTimeout(()=>{ try{ws.close();}catch{}; resolve(null); }, timeoutMs);
      ws.onopen = ()=> ws.send(JSON.stringify({id:1, command:'tx', transaction:txid, binary:false}));
      ws.onmessage = ev => {
        try{
          const msg = JSON.parse(ev.data);
          if (msg?.result?.hash === txid && msg?.result?.validated){
            clearTimeout(to); try{ws.close();}catch{}; resolve(msg.result);
          }
        }catch{}
      };
      ws.onerror = ()=>{ clearTimeout(to); try{ws.close();}catch{}; resolve(null); };
    });
  }

  // ---- Live Session (custodial balance held in BAG units) ----
  function active(){ const s = readSession(); return !!(s && s.addr && s.bag>0); }

  function spend(bag){
    const s = readSession(); if (!s || !(bag>0) || s.bag < bag) return false;
    s.bag = Math.max(0, s.bag - bag); s.ts = Date.now(); writeSession(s);
    $ev('bag:sessionSpend', { bag });
    return true;
  }
  function credit(bag){
    const s = readSession(); if (!s || !(bag>0)) return false;
    s.bag += bag; s.ts = Date.now(); writeSession(s);
    $ev('bag:sessionCredit', { bag });
    return true;
  }

  async function startSession({ usdDeposit } = {}){
    if (!ensureXumm()) throw new Error('Xaman SDK not loaded');
    const w = readWallet();
    if (!w?.address) throw new Error('Connect wallet first');

    if (!(PRICES.xrpUsd>0 && PRICES.bagUsd>0)) throw new Error('Waiting for live prices');
    const usd = Math.max(1, Math.min(500, Number(usdDeposit)||5));
    const drops = Math.round((usd / PRICES.xrpUsd) * 1_000_000);

    const { created, resolved } = await xumm.payload.createAndSubscribe({
      txjson: {
        TransactionType:'Payment',
        Destination: TREASURY,
        Amount: String(drops),
        Memos:[{Memo:{MemoType:btoa('BAG'), MemoData:btoa('CASINO_SESSION')}}]
      },
      options:{ submit:true, expire:300 }
    }, ev => { if (ev?.data && 'signed' in ev.data) return ev; });

    const res = await resolved;
    if (!res?.signed) throw new Error('User declined');
    const txid = res.response?.txid || res?.meta?.txid || created?.uuid || '';
    if (!txid) throw new Error('No txid');

    const validated = await waitForTx(txid, 60000);
    if (!validated || validated.engine_result !== 'tesSUCCESS') throw new Error('Payment not validated');

    const bagCredited = usd / PRICES.bagUsd;
    writeSession({ addr: w.address, bag: bagCredited, ts: Date.now(), tx: txid });
    $ev('bag:sessionStarted', { bag: bagCredited, txid });
    return bagCredited;
  }

  async function topUp({ usdDeposit } = {}){
    if (!ensureXumm()) throw new Error('Xaman SDK not loaded');
    const s = readSession(); if (!s?.addr) throw new Error('Start a session first');
    if (!(PRICES.xrpUsd>0 && PRICES.bagUsd>0)) throw new Error('Waiting for live prices');

    const usd = Math.max(1, Math.min(500, Number(usdDeposit)||5));
    const drops = Math.round((usd / PRICES.xrpUsd) * 1_000_000);

    const { created, resolved } = await xumm.payload.createAndSubscribe({
      txjson: {
        TransactionType:'Payment',
        Destination: TREASURY,
        Amount: String(drops),
        Memos:[{Memo:{MemoType:btoa('BAG'), MemoData:btoa('CASINO_TOPUP')}}]
      },
      options:{ submit:true, expire:300 }
    }, ()=>{});

    const got = await xumm.payload.get(created.uuid);
    const txid = got?.response?.txid || got?.meta?.txid;
    if (!txid) throw new Error('No txid (cancelled?)');

    const ok = await waitForTx(txid, 45000);
    if (!ok || ok.engine_result !== 'tesSUCCESS') throw new Error('Payment not validated');

    const addBag = usd / PRICES.bagUsd;
    const cur = readSession() || { addr: s.addr, bag: 0 };
    cur.bag = (Number(cur.bag)||0) + addBag; cur.ts = Date.now(); cur.lastTopUpTx = txid;
    writeSession(cur);
    $ev('bag:sessionToppedUp', { addBag, txid });
    return addBag;
  }

  function endSession(){
    const s = readSession();
    clearSession();
    $ev('bag:sessionEnded', s||{});
  }

  // ---- Demo mode (optional; mirrors your previous behavior) ----
  const demo = {
    enable(){
      if (localStorage.getItem(DEMO_KEY) == null) localStorage.setItem(DEMO_KEY, '1000');
      const bag = Number(localStorage.getItem(DEMO_KEY)||'1000') || 1000;
      writeSession({ addr:'demo', bag, ts: Date.now() });
      $ev('bag:demoEnabled', { bag });
    },
    spend(b){ const s=readSession(); if(!s||s.addr!=='demo'||s.bag<b) return false; s.bag-=b; writeSession(s); return true; },
    credit(b){ const s=readSession(); if(!s||s.addr!=='demo') return false; s.bag+=b; writeSession(s); return true; },
  };

  // ---- Public API (stable across pages) ----
  window.__bagSession = {
    // wallet
    connect: connectWallet,
    disconnect: disconnectWallet,

    // session
    active, get: readSession, set: writeSession,
    start: startSession, topUp, end: endSession,

    // balance ops
    spend, credit,

    // demo
    demo,
  };
})();
</script>
