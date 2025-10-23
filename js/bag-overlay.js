/* /js/bag-overlay.js  — One overlay to rule them all (Dice-standard)
   - Injects shared CSS + markup once (after <body> is ready)
   - Exposes window.BAGOverlay.showWin(opts) and window.showWin(opts) (alias)
   - Uses the exact Dice sizing (image width: min(82vw, 520px))
*/
(function (w, d) {
  if (w.BAGOverlay) return; // singleton

  // ---------- CSS (Dice standard) ----------
  const css = `
:root{
  --bag-win-z: 2147483647;
  --bag-win-bg: rgba(10,12,16,.70);
  --bag-win-img-max: 520px;
  --bag-win-img-vw: 82vw;
}
#win-canvas{ position:fixed; inset:0; pointer-events:none; z-index:calc(var(--bag-win-z) - 1); display:none; }
#win-overlay{ position:fixed; inset:0; display:none; place-items:center;
  background:radial-gradient(60% 60% at 50% 50%, rgba(24,160,251,.28), transparent 70%), var(--bag-win-bg);
  z-index:var(--bag-win-z); backdrop-filter:saturate(120%) blur(2px);
}
#win-card{ position:relative; text-align:center; padding:24px 32px; border-radius:16px;
  background:rgba(0,0,0,.35); box-shadow:0 10px 40px rgba(0,0,0,.45), inset 0 0 80px rgba(0,255,200,.06);
  transform:scale(.9); opacity:0; animation:bag-win-pop .35s cubic-bezier(.2,.9,.2,1) forwards, bag-win-float 1.8s ease-in-out .35s infinite;
}
#win-text{
  font: 900 64px/1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  letter-spacing:.06em; background:linear-gradient(90deg, #fff, #00ffb2, #fff); background-size:200% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-fill-color:transparent;
  text-shadow: 0 0 18px rgba(0,255,178,.35), 0 0 48px rgba(0,255,178,.25);
  filter:drop-shadow(0 4px 10px rgba(0,0,0,.35)); animation:bag-shine 1.6s linear infinite; white-space:nowrap;
}
#win-sub{ margin-top:8px; color:#e7f6ff; opacity:.9; font:600 16px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
#win-close{ position:absolute; top:8px; right:10px; border:0; background:transparent; color:#cfeaff; font:700 20px/1 system-ui; cursor:pointer; padding:6px 8px; opacity:.7; }

/* Dice/Plinko-exact image sizing + normalization for legacy #win-graphic */
#win-bag,
#win-graphic{
  display:none;
  width:min(var(--bag-win-img-vw), var(--bag-win-img-max)) !important;
  max-width:var(--bag-win-img-max) !important;
  height:auto;
  margin:14px auto 0;
  filter:drop-shadow(0 6px 18px rgba(0,255,178,.25));
}
#win-bag > img, #win-graphic > img{ width:100% !important; height:auto !important; border-radius:14px; }
#win-card > picture#win-bag, #win-card > picture#win-graphic { display:block; }

@keyframes bag-win-pop{ to{ transform:scale(1); opacity:1; } }
@keyframes bag-win-float{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-6px) } }
@keyframes bag-shine{ 0%{ background-position:0% 0 } 100%{ background-position:200% 0 } }
`;

  // ---------- DOM ensure (only once) ----------
  function injectOnce() {
    if (d.getElementById('win-overlay')) return;

    const style = d.createElement('style');
    style.id = 'bag-overlay-style';
    style.textContent = css;
    d.head.appendChild(style);

    const tpl = d.createElement('div');
    tpl.innerHTML = `
      <canvas id="win-canvas"></canvas>
      <div id="win-overlay" role="dialog" aria-live="polite" aria-label="Win notification">
        <div id="win-card">
          <button id="win-close" aria-label="Close">×</button>
          <div id="win-text">WIN</div>
          <div id="win-sub">Nice roll</div>
          <picture id="win-bag">
            <source type="image/webp"
                    srcset="/assets/bag-received-1024.webp 1024w, /assets/bag-received-960.webp 960w"
                    sizes="(min-width:900px) 520px, 82vw">
            <source type="image/png"
                    srcset="/assets/bag-received-1024.png 1024w, /assets/bag-received-960.png 960w"
                    sizes="(min-width:900px) 520px, 82vw">
            <img src="/assets/bag-received-1024.png" alt="$BAG received" decoding="async" loading="eager" />
          </picture>
        </div>
      </div>
    `;
    // append canvas then overlay
    d.body.appendChild(tpl.firstElementChild);
    d.body.appendChild(tpl.lastElementChild);
  }

  if (d.body) injectOnce();
  else d.addEventListener('DOMContentLoaded', injectOnce);

  // ---------- Confetti (Dice) ----------
  const overlay = () => d.getElementById('win-overlay');
  const canvas  = () => d.getElementById('win-canvas');
  const ctx     = () => (canvas() && canvas().getContext ? canvas().getContext('2d') : null);
  const titleEl = () => d.getElementById('win-text');
  const subEl   = () => d.getElementById('win-sub');
  const closeEl = () => d.getElementById('win-close');

  let rafId=null, particles=[], start=0, dur=2200, closing=false;

  function size(){
    const cv = canvas(), c = ctx();
    if (!cv || !c) return;
    const dpr=Math.min(w.devicePixelRatio||1,2);
    cv.width=w.innerWidth*dpr; cv.height=w.innerHeight*dpr;
    cv.style.width=w.innerWidth+'px'; cv.style.height=w.innerHeight+'px';
    try{ c.setTransform(dpr,0,0,dpr,0,0); }catch{}
  }
  function fire(n){
    particles.length=0;
    const colors=['#ffffff','#00ffb2','#18a0fb','#ffd166','#f72585'];
    for(let i=0;i<n;i++){
      particles.push({
        x:w.innerWidth*.5,y:w.innerHeight*.4,
        vx:(Math.random()-.5)*6, vy:-(3+Math.random()*5), g:.16,
        rot:Math.random()*6.28, vr:(Math.random()-.5)*.25,
        sz:6+Math.random()*10, col:colors[(Math.random()*colors.length)|0],
        shape:Math.random()<.4?'circle':(Math.random()<.5?'square':'tri')
      });
    }
  }
  function draw(){
    const c = ctx(); const cv = canvas();
    if (!c || !cv) return;
    c.clearRect(0,0,cv.width,cv.height);
    for(const p of particles){
      p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.rot+=p.vr;
      c.save(); c.translate(p.x,p.y); c.rotate(p.rot); c.fillStyle=p.col;
      const s=p.sz;
      if(p.shape==='circle'){ c.beginPath(); c.arc(0,0,s*0.6,0,Math.PI*2); c.fill(); }
      else if(p.shape==='square'){ c.fillRect(-s/2,-s/2,s,s); }
      else { c.beginPath(); c.moveTo(0,-s/1.2); c.lineTo(s/1.2,s/1.2); c.lineTo(-s/1.2,s/1.2); c.closePath(); c.fill(); }
      c.restore();
    }
  }
  function anim(ts){
    if(!start) start=ts;
    draw();
    if(ts-start<dur && !closing){ rafId=requestAnimationFrame(anim); }
    else { stop(); }
  }
  function stop(){
    try{ cancelAnimationFrame(rafId); }catch{}
    const c = ctx(), cv = canvas();
    if (c && cv) c.clearRect(0,0,cv.width,cv.height);
    if (cv) cv.style.display='none';
  }
  function show(){ const o=overlay(); if (o) o.style.display='grid'; }
  function hide(){ closing=true; stop(); const o=overlay(); if (o) o.style.display='none'; closing=false; }

  // Bind controls once the DOM is present
  function bindControls(){
    size();
    w.addEventListener('resize', size);
    const x = closeEl(), o = overlay();
    x && x.addEventListener('click', hide);
    o && o.addEventListener('click', e=>{ if(e.target===o) hide(); });
    w.addEventListener('keydown', e=>{ if(e.key==='Escape'){ clearTimeout(w.__winTimer); hide(); }});
  }
  if (d.readyState === 'complete' || d.readyState === 'interactive') bindControls();
  else d.addEventListener('DOMContentLoaded', bindControls);

  // ---------- Public API ----------
  function showWin(opts={}){
    const { message='WIN', subtext='Nice roll', duration=4200, sound=true, showImage } = opts;

    // prefer existing DOM if a page already provided it
    const bagPic = d.getElementById('win-bag') || d.getElementById('win-graphic');

    const t = titleEl(); const s = subEl(); const cv = canvas();
    if (t) t.textContent = String(message||'');
    if (s) s.textContent = String(subtext||'');

    show();
    if (cv){ cv.style.display='block'; }

    // If showImage is explicitly set, use it; otherwise follow Dice rule (WIN/JACKPOT/BLACKJACK)
    const shouldShow = (typeof showImage === 'boolean')
      ? showImage
      : /\b(win|jackpot|blackjack)\b/i.test(String(message||''));
    if (bagPic){ bagPic.style.display = shouldShow ? 'block' : 'none'; }

    fire(180);
    if (sound){ try{ w.__bagAudio && w.__bagAudio.chime && w.__bagAudio.chime(); }catch{} }

    try{ cancelAnimationFrame(rafId); }catch{}
    start=0; dur=2200; rafId=requestAnimationFrame(anim);

    clearTimeout(w.__winTimer);
    w.__winTimer = setTimeout(hide, Math.max(1200, Number(duration)||0 || 4200));
  }

  w.BAGOverlay = { showWin, hide, version: '1.1.0' };
  // Backward-compat alias so existing pages that call window.showWin keep working
  w.showWin = showWin;
})(window, document);
