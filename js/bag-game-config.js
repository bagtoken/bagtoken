<script>
/* Lightweight adapter for per-game terminology & payouts */
(function (w) {
  const DEF = {
    labels: { win:'Win', lose:'Scratch', push:'Push', blackjack:'Blackjack' },
    payouts: { WIN: 2.00, PUSH: 1.00, BJ: 2.00 } // BJ used only by Blackjack
  };

  // Registry keyed by game id
  const REG = {
    blackjack: {
      labels: { lose:'Scratch', win:'Win', push:'Push', blackjack:'Blackjack' },
      payouts:{ WIN:1.25, PUSH:1.00, BJ:2.00 }
    },
    poker: {
      labels: { lose:'Scratch', win:'Win', push:'Push' },
      payouts:{ WIN:2.00, PUSH:1.00 }
    }
  };

  function getGameId(){
    // read from data attribute or fallback to 'poker'
    const root = document.getElementById('tableBoard') || document.body;
    return (root?.dataset?.game || w.__BAG_GAME__ || 'poker').toLowerCase();
  }

  function merge(a,b){ return Object.assign({}, a, b || {}); }

  const API = {
    game(){ return getGameId(); },
    labels(over={}){ const id=getGameId(); return merge(DEF.labels, merge(REG[id]?.labels, over)); },
    payouts(over={}){ const id=getGameId(); return merge(DEF.payouts, merge(REG[id]?.payouts, over)); },
    // helpers used by games:
    term(key){ return API.labels()[key] || key; },
    payMult(kind){ return API.payouts()[kind.toUpperCase()] || 0; }
  };

  w.BAGGame = API;
})(window);
</script>
