<script>
/* BAGRules — universal rules FAB + modal
   Usage:
     BAGRules.mount({
       container: '#feltBoard',            // where to pin the FAB (absolute-pos parent)
       title: '🃏 Blackjack — Quick Rules',// modal title
       html: document.querySelector('#rules-blackjack')?.innerHTML, // rules HTML
       position: 'br'                      // 'br'|'bl'|'tr'|'tl'
     });
*/
(function(global){
  function cssOnce(){
    if (document.getElementById('bag-rules-css')) return;
    const s=document.createElement('style');
    s.id='bag-rules-css';
    s.textContent = `
      .bag-rules-fab{
        position:absolute; z-index:5;
        right:12px; bottom:12px;
        background:linear-gradient(180deg,#4ea3ff,#287bff);
        color:#f7fbff; font-weight:800; border:1px solid #1e5fd1;
        padding:6px 10px; font-size:13px; border-radius:999px;
        box-shadow:0 6px 16px rgba(40,123,255,.25), inset 0 1px 0 rgba(255,255,255,.12);
        cursor:pointer; transition:transform .06s ease, box-shadow .2s ease, filter .15s ease;
      }
      .bag-rules-fab:hover{ filter:brightness(1.05); box-shadow:0 6px 16px rgba(40,123,255,.3), 0 10px 30px rgba(0,0,0,.25); }
      .bag-rules-fab:active{ transform:translateY(1px); }

      .bag-rules-overlay{
        display:none; place-items:center;
        position:fixed; inset:0; z-index:1200;
        background:rgba(0,0,0,.55); backdrop-filter:saturate(120%) blur(6px);
        padding:16px;
      }
      .bag-rules-modal{
        width:min(680px,96vw);
        background:linear-gradient(180deg,#0b1b13,#0d2217); color:#eaf3ec;
        border:1px solid #204b33; border-radius:16px; box-shadow:0 18px 42px rgba(0,0,0,.45);
        padding:18px 18px 20px; position:relative;
      }
      .bag-rules-modal h3{ margin:0 0 10px; font-size:1.2rem; }
      .bag-rules-modal .rules-note{ margin-top:12px; font-size:.9rem; color:#cfe2d6; opacity:.9; }
      .bag-rules-close{
        position:absolute; top:10px; right:10px; width:32px; height:32px; border-radius:8px;
        display:inline-grid; place-items:center; border:1px solid #2b6a48; background:#15261c; color:#e9efe9;
        font-size:20px; line-height:1; cursor:pointer;
      }
      @media (max-width:520px){ .bag-rules-modal{ padding:16px; } .bag-rules-modal h3{ font-size:1.1rem; } }
    `;
    document.head.appendChild(s);
  }

  function makeOverlay(title, html){
    const ov = document.createElement('div');
    ov.className = 'bag-rules-overlay';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');

    const box = document.createElement('div');
    box.className = 'bag-rules-modal';
    box.setAttribute('role','document');

    const close = document.createElement('button');
    close.className = 'bag-rules-close';
    close.setAttribute('aria-label','Close');
    close.textContent = '×';

    const h = document.createElement('h3');
    h.textContent = title || 'ℹ️ Rules';

    const content = document.createElement('div');
    content.innerHTML = html || '<p>No rules provided.</p>';

    close.addEventListener('click', ()=> ov.style.display='none');
    ov.addEventListener('click', (e)=>{ if(e.target===ov) ov.style.display='none'; });
    addEventListener('keydown', (e)=>{ if(e.key==='Escape') ov.style.display='none'; });

    box.appendChild(close);
    box.appendChild(h);
    box.appendChild(content);
    ov.appendChild(box);
    document.body.appendChild(ov);
    return ov;
  }

  function pinFab(container, label){
    const btn = document.createElement('button');
    btn.className = 'bag-rules-fab';
    btn.type = 'button';
    btn.textContent = label || 'ℹ️ Rules';
    container.style.position = getComputedStyle(container).position === 'static' ? 'relative' : container.style.position;
    container.appendChild(btn);
    return btn;
  }

  function setPos(btn, container, pos){
    const map = { br:['auto','12px','12px','auto'], bl:['auto','12px','auto','12px'], tr:['12px','auto','12px','auto'], tl:['12px','auto','auto','12px'] };
    const v = map[pos||'br'];
    btn.style.top    = v[0];
    btn.style.right  = v[2];
    btn.style.bottom = v[1];
    btn.style.left   = v[3];
  }

  function mount(opts){
    cssOnce();
    const {
      container = '#feltBoard',
      title = 'ℹ️ Rules',
      html = '',
      position = 'br',
      label = 'ℹ️ Rules'
    } = opts || {};

    const host = (typeof container==='string') ? document.querySelector(container) : container;
    if (!host) return console.warn('[BAGRules] container not found:', container);

    const ov = makeOverlay(title, html);
    const fab = pinFab(host, label);
    setPos(fab, host, position);
    fab.addEventListener('click', ()=>{ ov.style.display='grid'; });
    return { overlay: ov, fab };
  }

  // auto-mount via data attributes:
  // <div id="feltBoard" data-bag-rules="#rules-blackjack" data-bag-rules-title="..."></div>
  function auto(){
    document.querySelectorAll('[data-bag-rules]').forEach(node=>{
      const tplSel = node.getAttribute('data-bag-rules');
      const title  = node.getAttribute('data-bag-rules-title') || 'ℹ️ Rules';
      const pos    = node.getAttribute('data-bag-rules-pos')   || 'br';
      const label  = node.getAttribute('data-bag-rules-label') || 'ℹ️ Rules';
      const tpl = tplSel ? document.querySelector(tplSel) : null;
      const html = tpl ? tpl.innerHTML : '';
      mount({ container: node, title, html, position: pos, label });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

  global.BAGRules = { mount };
})(window);
</script>
