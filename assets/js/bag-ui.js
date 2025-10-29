/*!
 * $BAG — Universal UI Controls
 * - Disables zoom gestures globally
 * - Handles 🔊 top-right sound toggle across all pages
 */

(function(){
  'use strict';

  // --- Disable zoom (pinch, dbltap, ctrl+scroll)
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('gestureend', e => e.preventDefault());
  document.addEventListener('wheel', e => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault());

  // --- Sound toggle setup
  const PREF_KEY   = 'bag_sound_pref';
  const UNLOCK_KEY = 'bag_audio_unlocked_v1';
  const audioId    = 'casinoAmbience';
  const toggleId   = 'soundToggle';

  let audio = document.getElementById(audioId);
  let btn   = document.getElementById(toggleId);

  // Auto-create toggle if not present
  if (!btn) {
    btn = document.createElement('button');
    btn.id = toggleId;
    btn.textContent = '🔇';
    btn.title = 'Toggle sound';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '10px',
      right: '12px',
      zIndex: 999999,
      background: 'rgba(0,0,0,.35)',
      border: '1px solid #2b6a48',
      borderRadius: '12px',
      padding: '8px 10px',
      color: '#ffd700',
      fontSize: '1.2rem',
      cursor: 'pointer',
      opacity: '.9',
      backdropFilter: 'blur(4px)',
      transition: 'opacity .2s ease, transform .12s ease'
    });
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '.9');
    document.body.appendChild(btn);
  }

  if (!audio) {
    audio = document.createElement('audio');
    audio.id = audioId;
    audio.src = '/assets/sounds/casinomusic.mp3';
    audio.loop = true;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.volume = 0.08;
    document.body.appendChild(audio);
  }

  let unlocked = false, started = false, playing = false, inView = false;

  function setIcon() {
    btn.textContent = playing ? '🔊' : '🔇';
    btn.setAttribute('aria-pressed', String(playing));
  }

  async function playIfAllowed() {
    if (localStorage.getItem(PREF_KEY) === 'off' || !unlocked) return;
    try {
      await audio.play();
      playing = true;
      started = true;
      setIcon();
    } catch {}
  }

  function pauseNow() {
    try { audio.pause(); } catch {}
    playing = false;
    setIcon();
  }

  btn.addEventListener('pointerdown', async e => {
    e.preventDefault();
    if (playing) {
      localStorage.setItem(PREF_KEY, 'off');
      pauseNow();
    } else {
      localStorage.setItem(PREF_KEY, 'on');
      unlocked = true;
      if (inView || document.visibilityState === 'visible') playIfAllowed();
    }
  });

  // User gesture unlock
  const UNLOCK_EVENTS = ['pointerdown','touchstart','mousedown','keydown','wheel','scroll'];
  function onFirstUserGesture() {
    if (unlocked) return;
    unlocked = true;
    if (inView) playIfAllowed();
  }
  UNLOCK_EVENTS.forEach(t => window.addEventListener(t, onFirstUserGesture, { once:true, passive:true }));

  // Watch for casino image (if present)
  const target = document.getElementById('bag-casino-img');
  if (target) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.target !== target) continue;
        inView = e.isIntersecting && e.intersectionRatio >= 0.5;
        if (inView && !started) playIfAllowed();
      }
    }, { threshold:[0,0.5,1], rootMargin:'100px' });
    io.observe(target);
  } else {
    // No casino section — just respect toggle
    inView = true;
  }

  setIcon();
})();
