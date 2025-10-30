<script>
(function(){
  window.BAG = window.BAG || {};
  window.BAG.roulette = window.BAG.roulette || {};
  const S = window.BAG.roulette.state = window.BAG.roulette.state || {};

  // tiers per your design
  const TIERS = [1.00, 1.25, 1.50, 1.75, 2.00];
  function pickTier(kind, demo){
    // kind: 'OUTSIDE' | 'MID' | 'INSIDE'
    const w = demo
      ? (kind==='OUTSIDE' ? [0.44,0.38,0.12,0.05,0.01]
        : kind==='MID'   ? [0.40,0.34,0.16,0.07,0.03]
                         : [0.38,0.30,0.17,0.10,0.05])
      : (kind==='OUTSIDE' ? [0.58,0.30,0.08,0.035,0.005]
        : kind==='MID'   ? [0.50,0.30,0.12,0.06,0.02]
                         : [0.46,0.28,0.14,0.08,0.04]);
    let r = Math.random();
    for (let i=0;i<w.length;i++){ if ((r-=w[i])<=0) return TIERS[i]; }
    return TIERS.at(-1);
  }

  function computeWin({hit, sel, baseBag, demo}){
    // sel = { straight, rb, eo, hl, dozen, col }, baseBag = stake in BAG for this spin
    const isNum = v => typeof v==='number' && isFinite(v);
    const COLOR = {}; ["00",0].forEach(n=>COLOR[n]="green");
    [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].forEach(n=>COLOR[n]="red");
    [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].forEach(n=>COLOR[n]="black");
    const COLUMN = {}; [1,4,7,10,13,16,19,22,25,28,31,34].forEach(n=>COLUMN[n]="C1");
    [2,5,8,11,14,17,20,23,26,29,32,35].forEach(n=>COLUMN[n]="C2");
    [3,6,9,12,15,18,21,24,27,30,33,36].forEach(n=>COLUMN[n]="C3");

    const notes = [];
    let win = 0;
    const add = (kind, label) => { const t=pickTier(kind, demo); win += baseBag*t; notes.push(`${label} ×${t.toFixed(2)}`); };

    // Straight
    if (sel.straight){
      const ok = sel.straight==='00' ? hit==="00" : (isNum(hit) && Number(sel.straight)===hit);
      if (ok) add('INSIDE','Straight');
    }
    // Red/Black
    if (sel.rb && COLOR[hit] && COLOR[hit].toUpperCase()===sel.rb) add('OUTSIDE','RB');
    // Even/Odd
    if (sel.eo && isNum(hit) && hit!==0){
      if ((sel.eo==='EVEN' && hit%2===0) || (sel.eo==='ODD' && hit%2===1)) add('OUTSIDE','EO');
    }
    // Low/High
    if (sel.hl && isNum(hit) && hit!==0){
      if ((sel.hl==='LOW' && hit>=1 && hit<=18) || (sel.hl==='HIGH' && hit>=19 && hit<=36)) add('OUTSIDE','HL');
    }
    // Dozen
    if (sel.dozen && isNum(hit) && hit!==0){
      if ((sel.dozen==='D1' && hit<=12) || (sel.dozen==='D2' && hit<=24 && hit>=13) || (sel.dozen==='D3' && hit>=25)) add('MID','Dozen');
    }
    // Column
    if (sel.col && isNum(hit) && hit!==0 && COLUMN[hit]===sel.col) add('MID','Column');

    return { winBag: win, notes };
  }

  // Listen for a spin resolution from your wheel engine
  window.addEventListener('bag:roulette:resolve', (e)=>{
    const d = e.detail||{};
    const res = computeWin(d);
    if (res.winBag>0){
      try{ window.__bagSession?.credit?.(res.winBag); }catch{}
    }
    window.dispatchEvent(new CustomEvent('bag:roulette:payout', { detail:{ ...d, ...res }}));
  });

  // Expose for debugging
  window.BAG.roulette.computeWin = computeWin;
})();
</script>
