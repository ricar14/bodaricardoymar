import './style.css'
// import typescriptLogo from './typescript.svg'
// import viteLogo from '/vite.svg'
// import { setupCounter } from './counter.ts'
import "./style.css";

// Smooth scrolling effect for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", (e) => {
    const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
    if (!href) return;
    const target = document.querySelector(href) as HTMLElement | null;
    // Only perform smooth scroll if the target is currently visible in the layout
    // This avoids scrolling to hidden elements which can produce a mid-screen view
    if (target) {
      const style = window.getComputedStyle(target);
      const isHidden = style.display === 'none' || target.hasAttribute('hidden') || target.classList.contains('hidden');
      if (!isHidden) {
        e.preventDefault();
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
          target.scrollIntoView();
        }
      }
    }
  });
});

// Add fade-in animation on scroll
const fadeInElements = document.querySelectorAll(".fade-in");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.1 }
);

fadeInElements.forEach((el) => observer.observe(el));

// Puzzle initialization helper: ensure the puzzle is created when needed.
function initPuzzleIfNeeded() {
  if ((window as any).setupPuzzle) return; // already initialized

  const puzzleGate = document.getElementById("puzzle-gate");
  const puzzleBoardElLocal = document.getElementById("puzzle-board");
  const resetPuzzleBtnElLocal = document.getElementById("reset-puzzle");

  if (!(puzzleBoardElLocal && puzzleGate && resetPuzzleBtnElLocal)) return;

  const puzzleBoard = puzzleBoardElLocal as HTMLElement;
  const resetPuzzleBtn = resetPuzzleBtnElLocal as HTMLButtonElement;
  const SIZE = 3; // 3x3
  let PIECE_SIZE = 106; // will be computed to fit 90% of viewport
  const FIXED_POS = 1; // mantener la pieza central-superior (segunda, índice 1) fija como ayuda
  // Support multiple fixed positions (hints). Start with the original fixed pos.
  const fixedPositions = new Set<number>([FIXED_POS]);
  let pieces: number[] = [];
  let draggingIndex: number | null = null;

  function shufflePieces() {
    // Build a shuffled array but keep any fixed positions fixed in their correct places
    const total = SIZE * SIZE;
    const all = Array.from({ length: total }, (_, i) => i);
    // Pieces that must remain as the correct tile (indices)
    const availablePieces = all.filter(i => !fixedPositions.has(i));
    // Positions that we can place movable pieces into
    const availablePositions = all.filter(pos => !fixedPositions.has(pos));
    // Fisher-Yates shuffle for availablePieces
    for (let i = availablePieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePieces[i], availablePieces[j]] = [availablePieces[j], availablePieces[i]];
    }
    pieces = new Array(total);
    // Set fixed positions to their correct piece (solved for that slot)
    for (const pos of fixedPositions) pieces[pos] = pos;
    // Fill remaining positions with shuffled available pieces
    for (let k = 0; k < availablePositions.length; k++) {
      pieces[availablePositions[k]] = availablePieces[k];
    }
  }

  function isSolved(): boolean {
    return pieces.every((v, i) => v === i);
  }

  function renderPuzzle() {
    puzzleBoard.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const idx = pieces[i];
      const piece = document.createElement('div');
      piece.className = 'puzzle-piece';
      // Make any fixed piece non-draggable and visually static
      const isFixed = fixedPositions.has(i);
      piece.draggable = !isFixed;
      piece.style.width = `${PIECE_SIZE}px`;
      piece.style.height = `${PIECE_SIZE}px`;
      piece.style.position = 'absolute';
      piece.style.left = `${(i % SIZE) * PIECE_SIZE}px`;
      piece.style.top = `${Math.floor(i / SIZE) * PIECE_SIZE}px`;
      piece.style.backgroundImage = "url('/img/historia-roja-dani-elena.png')";
      piece.style.backgroundSize = `${SIZE * PIECE_SIZE}px ${SIZE * PIECE_SIZE}px`;
      piece.style.backgroundPosition = `-${(idx % SIZE) * PIECE_SIZE}px -${Math.floor(idx / SIZE) * PIECE_SIZE}px`;
      piece.dataset.index = i.toString();
      piece.dataset.piece = idx.toString();
      // Mark any fixed piece with a special class so it can be highlighted
      if (isFixed) {
        piece.classList.add('puzzle-piece-fixed');
        piece.setAttribute('aria-label', 'pieza fija, ayuda: no mover');
        // Add joining classes if adjacent fixed pieces exist so CSS can merge borders
        const col = i % SIZE;
        const row = Math.floor(i / SIZE);
        // left
        if (col > 0 && fixedPositions.has(i - 1)) piece.classList.add('fixed-join-left');
        // right
        if (col < SIZE - 1 && fixedPositions.has(i + 1)) piece.classList.add('fixed-join-right');
        // top
        if (row > 0 && fixedPositions.has(i - SIZE)) piece.classList.add('fixed-join-top');
        // bottom
        if (row < SIZE - 1 && fixedPositions.has(i + SIZE)) piece.classList.add('fixed-join-bottom');
      }

      // Only attach drag/drop handlers for movable pieces
      if (!isFixed) {
        piece.addEventListener('dragstart', () => {
          draggingIndex = i;
          piece.classList.add('dragging');
        });
        piece.addEventListener('dragend', () => {
          draggingIndex = null;
          piece.classList.remove('dragging');
        });
        piece.addEventListener('dragover', (event) => {
          event.preventDefault();
        });
        piece.addEventListener('drop', (e) => {
          e.preventDefault();
          // Prevent swapping with any fixed position
          if (draggingIndex !== null && draggingIndex !== i && !fixedPositions.has(i) && !fixedPositions.has(draggingIndex)) {
            [pieces[draggingIndex], pieces[i]] = [pieces[i], pieces[draggingIndex]];
            renderPuzzle();
            if (isSolved()) setTimeout(puzzleSolved, 300);
          }
        });
      }

      // Touch handlers only for movable pieces
      if (!isFixed) {
        let touchDragging = false;
        piece.addEventListener('touchstart', (e) => {
          if (e.touches.length !== 1) return;
          touchDragging = true;
          draggingIndex = i;
          piece.classList.add('dragging');
          e.preventDefault();
        }, {passive: false});
        piece.addEventListener('touchmove', (e) => {
          if (!touchDragging || draggingIndex === null) return;
          if (e.touches.length !== 1) return;
          const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
          if (target && target instanceof HTMLElement && target.classList.contains('puzzle-piece') && target !== piece) {
            const otherIndexStr = target.dataset.index;
            if (otherIndexStr !== undefined) {
              const otherIndex = parseInt(otherIndexStr);
              // Prevent swapping with any fixed position
              if (!fixedPositions.has(otherIndex) && !fixedPositions.has(draggingIndex)) {
                [pieces[draggingIndex], pieces[otherIndex]] = [pieces[otherIndex], pieces[draggingIndex]];
                draggingIndex = otherIndex;
                renderPuzzle();
              }
            }
          }
          e.preventDefault();
        }, {passive: false});
        piece.addEventListener('touchend', (e) => {
          touchDragging = false;
          piece.classList.remove('dragging');
          draggingIndex = null;
          if (isSolved()) setTimeout(puzzleSolved, 300);
          e.preventDefault();
        }, {passive: false});
      }

      puzzleBoard.appendChild(piece);
    }
  }

  function setupPuzzle() {
    // Compute responsive sizes: make puzzle occupy 90% of the smaller viewport dimension
    function computeSizes() {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const boardSize = Math.max(200, Math.floor(vmin * 0.9)); // at least 200px
      PIECE_SIZE = Math.floor(boardSize / SIZE);
      // ensure integer piece size and boardSize is exact multiple
      const exactBoard = PIECE_SIZE * SIZE;
      puzzleBoard.style.position = 'relative';
      puzzleBoard.style.width = `${exactBoard}px`;
      puzzleBoard.style.height = `${exactBoard}px`;
    }

    // initial compute
    computeSizes();
    // recompute on resize to remain responsive
    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        computeSizes();
        renderPuzzle();
      }, 120);
    };
    window.addEventListener('resize', onResize);

    shufflePieces();
    renderPuzzle();
    // New behavior for the 'Pista' button: mark a new fixed piece (hint)
    const MAX_HINTS = 4;
    const updateResetButtonState = () => {
      if (fixedPositions.size >= MAX_HINTS) {
        resetPuzzleBtn.disabled = true;
      } else {
        resetPuzzleBtn.disabled = false;
      }
    };

    resetPuzzleBtn.onclick = () => {
      // choose a random position that is not already fixed
      const total = SIZE * SIZE;
      const candidates: number[] = [];
      for (let pos = 0; pos < total; pos++) {
        if (!fixedPositions.has(pos)) candidates.push(pos);
      }
      if (candidates.length === 0) return;
      // pick randomly from candidates
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      // Mark as fixed and place its correct piece at that position by swapping
      fixedPositions.add(pick);
      const currentIndex = pieces.findIndex(v => v === pick);
      if (currentIndex !== -1 && currentIndex !== pick) {
        [pieces[currentIndex], pieces[pick]] = [pieces[pick], pieces[currentIndex]];
      } else {
        pieces[pick] = pick;
      }
      renderPuzzle();
      updateResetButtonState();
      if (fixedPositions.size >= MAX_HINTS) resetPuzzleBtn.disabled = true;
    };
    // initialize button state
    updateResetButtonState();
  }

  setupPuzzle();
  (window as any).setupPuzzle = setupPuzzle;
  (window as any).puzzleInitialized = true;
}

// Try to initialize puzzle on load in case DOM had the elements ready
initPuzzleIfNeeded();
// Global arrays used to decide which sections to show after invitation/puzzle
const FALLBACK_IDS = [
  'nos-casamos',
  'wedding-info',
  'confirmacion-asistencia',
  'salon-celebraciones',
  'celebracion',
  'fiesta',
  'itinerario',
  'spotify',
  'imagenesBoda'
];
const invitationCard = document.querySelector("#invitation-card") as HTMLElement;
const envelopeAnim = document.getElementById("envelope-anim");
const sobreAnimadoEl = document.getElementById("sobreAnimado") as HTMLElement | null;
// Element reference for the puzzle gate (used when revealing the invitation)
const puzzleGateEl = document.getElementById("puzzle-gate");

// Sin accesos iniciales, las secciones principales se muestran directamente.
showMainSections();


function puzzleSolved() {
  console.log('puzzleSolved() ejecutado: puzzle-gate se ocultará y se mostrarán las secciones.');
  // Mostrar sólo el desvanecimiento final (sin efecto destello)
    const gate = document.getElementById('puzzle-gate');
    if (!gate) return;
  // Mostrar la imagen completa del puzzle como ayuda visual final durante 1s
  const puzzleBoardEl = document.getElementById('puzzle-board') as HTMLElement | null;
  if (puzzleBoardEl) {
    // Crear overlay absoluto dentro de #puzzle-board para no afectar el layout
    const fullImg = document.createElement('img');
    fullImg.src = '/img/historia-roja-dani-elena.png';
    fullImg.id = 'puzzle-complete-img';
    fullImg.style.position = 'absolute';
    fullImg.style.left = '0';
    fullImg.style.top = '0';
    fullImg.style.width = '100%';
    fullImg.style.height = '100%';
    fullImg.style.objectFit = 'cover';
    fullImg.style.zIndex = '999';
    fullImg.style.pointerEvents = 'none';
    fullImg.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)';

    // Asegurar que #puzzle-board es contenedor relativo (se hace en setupPuzzle, pero por seguridad):
    try { puzzleBoardEl.style.position = puzzleBoardEl.style.position || 'relative'; } catch (e) { /* noop */ }

    // Añadir overlay y ocultar solo las piezas (manteniendo el espacio)
    puzzleBoardEl.appendChild(fullImg);
    const piecesEls = Array.from(puzzleBoardEl.querySelectorAll('.puzzle-piece')) as HTMLElement[];
    piecesEls.forEach(p => p.style.visibility = 'hidden');

    // Después de 1.5s, quitar overlay y continuar con el desvanecimiento y mostrar secciones
    setTimeout(() => {
      try { fullImg.remove(); } catch (e) { /* noop */ }
      piecesEls.forEach(p => p.style.visibility = 'visible');
      // Forzar reflow y aplicar nueva clase de desvanecimiento
      gate.classList.remove('puzzle-success');
      void gate.offsetWidth;
      gate.classList.add('desvanecer');

      let finished = false;
      const showSections = () => {
        if (finished) return;
        finished = true;
        gate.style.display = 'none';
        if (envelopeAnim) envelopeAnim.style.display = "none";
        if (sobreAnimadoEl && (sobreAnimadoEl instanceof HTMLMediaElement)) {
          sobreAnimadoEl.pause();
        }
        document.body.classList.remove('no-scroll');
        const idsToShowLocal = [
          'nos-casamos','wedding-info','confirmacion-asistencia','itinerario','salon-celebraciones','countdown-section','celebracion','spotify','imagenesBoda'
        ];
        const ordered = Array.from(new Set([...(idsToShowLocal || []), ...(FALLBACK_IDS || [])]));
        ordered.forEach(id => {
          const sec = document.getElementById(id);
          if (sec) {
            sec.classList.remove('hidden');
            sec.removeAttribute('hidden');
            sec.style.removeProperty('display');
            sec.style.display = 'flex';
            if (sec.dataset && sec.dataset.hiddenByPuzzle) {
              try { sec.style.removeProperty('visibility'); } catch(e) { /* noop */ }
              delete sec.dataset.hiddenByPuzzle;
            }
          }
        });
        try {
          const frames = Array.from(document.querySelectorAll('.itinerario-frame, .itinerario-frame-big, .itinerario-frame-big2')) as HTMLElement[];
          frames.forEach(f => {
            const r = f.getBoundingClientRect();
            if (r.top >= 0 && r.top < (window.innerHeight * 0.9)) {
              f.classList.add('in-place');
            }
          });
        } catch (e) { /* noop */ }
        try {
          const wedding = document.getElementById('wedding-info');
          const carousel = document.getElementById('carousel-section');
          if (wedding && carousel && wedding.parentNode) {
            wedding.parentNode.insertBefore(carousel, wedding);
          }
        } catch (e) { /* noop */ }
        try {
          ensureMusicControl();
          const audio = document.getElementById('page-music') as HTMLAudioElement | null;
          if (audio) {
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.catch((err) => { console.debug('Autoplay blocked or failed:', err); });
            }
          }
        } catch (e) { /* noop */ }
        const backBtn = document.getElementById('back-from-form');
        if (backBtn) backBtn.style.display = 'none';
        const inv = document.getElementById('invitation-card'); if (inv) { inv.classList.add('hidden'); inv.style.display='none'; }
        const pg = document.getElementById('puzzle-gate'); if (pg) { pg.classList.add('hidden'); pg.style.display='none'; pg.classList.remove('active'); }
        // No forzamos scroll aquí para evitar movimientos inesperados
      };
      const fallback = setTimeout(showSections, 450);
      gate.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'opacity') {
          clearTimeout(fallback);
          gate.removeEventListener('transitionend', handler);
          showSections();
        }
      });
    }, 1000);
    return;
  }
  // Fallback: si no existe puzzleBoard, seguir comportamiento anterior
  setTimeout(() => {
    gate.classList.remove('puzzle-success');
    void gate.offsetWidth;
    gate.classList.add('desvanecer');
  }, 300);
}



// Event listener for invitation card
if (envelopeAnim && sobreAnimadoEl && invitationCard) {
  const revealFromInvitation = () => {
    invitationCard.classList.add("fade-out");
    // allow page scrolling again
    document.body.classList.remove('no-scroll');
    setTimeout(() => {
      invitationCard.style.display = "none";
      if (envelopeAnim) envelopeAnim.style.display = "none";
      if (sobreAnimadoEl && (sobreAnimadoEl instanceof HTMLMediaElement)) {
        try { sobreAnimadoEl.pause(); } catch (e) { /* noop */ }
      }
      // Show the puzzle gate first (if present). If not, fall back to showing main sections.
      if (puzzleGateEl) {
        // Ensure puzzle is initialized before showing the gate
        try { initPuzzleIfNeeded(); } catch (e) { /* noop */ }
        // Remove `hidden` attribute (we added it in the HTML) so it becomes visible
        try { puzzleGateEl.removeAttribute('hidden'); } catch(e) { /* noop */ }
        puzzleGateEl.classList.remove('hidden');
        // Use flex when section is full-screen-like, otherwise block
        puzzleGateEl.style.display = puzzleGateEl.classList.contains('full-screen') ? 'flex' : 'block';
        // Mark overlay active so CSS ensures centering and z-index
        puzzleGateEl.classList.add('active');
        // Ensure other sections remain hidden while the puzzle is active
        document.querySelectorAll('section').forEach(function(s){
          if (s.id === 'puzzle-gate') return;
          try { (s as HTMLElement).style.display = 'none'; } catch(e) { /* noop */ }
          s.classList.add('hidden');
        });
        // Explicitly hide `#itinerario` (extra safety) and mark for restoration
        try {
          const itin = document.getElementById('itinerario');
          if (itin) {
            (itin as HTMLElement).style.display = 'none';
            (itin as HTMLElement).style.visibility = 'hidden';
            // @ts-ignore
            itin.dataset.hiddenByPuzzle = 'true';
          }
        } catch (e) { /* noop */ }
        // keep page scroll locked while solving the puzzle
        document.body.classList.add('no-scroll');
        // Ensure overlay is shown; keep page at top (do not scroll to element)
      } else {
        showMainSections();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
  };

  if (sobreAnimadoEl instanceof HTMLMediaElement) {
    sobreAnimadoEl.currentTime = 0;
    sobreAnimadoEl.pause();
    // when the media ends, reveal the site
    sobreAnimadoEl.onended = revealFromInvitation;
  }

  // Play only the first 2 seconds on click, then reveal sections.
  {
    let clicked = false;
    envelopeAnim.addEventListener("click", () => {
      if (clicked) return;
      clicked = true;
      if (sobreAnimadoEl instanceof HTMLMediaElement) {
        try {
          sobreAnimadoEl.currentTime = 0;
        } catch (e) { /* ignore if seek not allowed yet */ }
        sobreAnimadoEl.playbackRate = 1;
        const playPromise = sobreAnimadoEl.play();
        // Smoothly fade out the poster image once playback actually starts
        try {
          const posterEl = document.getElementById('sobrePoster') as HTMLElement | null;
          if (posterEl && sobreAnimadoEl) {
            const fadePoster = () => {
              try { posterEl.style.opacity = '0'; } catch (e) {}
              setTimeout(() => { try { posterEl.remove(); } catch (e) {} }, 420);
              sobreAnimadoEl.removeEventListener('playing', fadePoster);
            };
            sobreAnimadoEl.addEventListener('playing', fadePoster);
            // If the video already buffered a frame, ensure we still fade
            if (!sobreAnimadoEl.paused && !sobreAnimadoEl.seeking) {
              // small timeout to allow first frame render
              setTimeout(() => { try { posterEl.style.opacity = '0'; } catch (e) {} }, 80);
            }
          }
        } catch (e) { /* noop */ }
        // After ~1.3s of playback, pause and reveal the site
        const revealAfter = 1300;
        const t = setTimeout(() => {
          try { sobreAnimadoEl.pause(); } catch (e) {}
          revealFromInvitation();
        }, revealAfter);
        // In case the media ends earlier, ensure we clear the timeout and reveal
        const onEndOrError = () => {
          clearTimeout(t);
          revealFromInvitation();
          sobreAnimadoEl.removeEventListener('ended', onEndOrError);
          sobreAnimadoEl.removeEventListener('error', onEndOrError);
        };
        sobreAnimadoEl.addEventListener('ended', onEndOrError);
        sobreAnimadoEl.addEventListener('error', onEndOrError);
        // If play() returns a promise, handle rejection (e.g., autoplay policy)
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {
            // If playback failed, just reveal immediately
            clearTimeout(t);
            revealFromInvitation();
          });
        }
      } else {
        // element is not media (e.g. an image) — reveal immediately
        revealFromInvitation();
      }
    });
  }
}

// Seal and envelope animation logic


// RSVP form logic
const form = document.querySelector<HTMLFormElement>("#form form");

// Backend API URL: usar backend local en desarrollo (localhost/file), ruta relativa en producción
const isLocal = window.location.hostname.includes('localhost') || window.location.protocol === 'file:';
const API_URL = isLocal ? 'http://localhost:3001/api/guests' : '/api/guests';
console.log('Frontend startup - API_URL =', API_URL);

async function saveGuestBackend(guest: { name: string; email: string; guests: number }) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guest)
    });
    if (!res.ok) {
      try { return await res.json(); } catch (e) { return { error: `Error en respuesta del servidor: ${res.status}` }; }
    }
    return await res.json();
  } catch (err) {
    console.error('Error saving guest:', err);
    return { error: 'No se pudo conectar con el servidor. Inténtalo más tarde.' };
  }
}

// Navigation helpers: show only one section (used for confirm -> form flow)
function showOnlySection(id: string) {
  // Hide all sections and mark them hidden to match inline hash handler behavior
  document.querySelectorAll('section').forEach(sec => {
    try { sec.setAttribute('hidden', ''); } catch(e) { /* noop */ }
    try { (sec as HTMLElement).style.display = 'none'; } catch(e) { /* noop */ }
  });
  const target = document.getElementById(id);
  if (target) {
    console.debug('[showOnlySection] showing', id);
    try { target.removeAttribute('hidden'); } catch(e) { /* noop */ }
    try { (target as HTMLElement).style.visibility = 'visible'; } catch(e) { /* noop */ }
    try { (target as HTMLElement).style.display = (target.classList.contains('full-screen') ? 'flex' : 'block'); } catch(e) { /* noop */ }
    try { target.classList.remove('hidden'); } catch(e) { /* noop */ }
    try { target.removeAttribute('aria-hidden'); } catch(e) { /* noop */ }
    // Ensure page can scroll to show the form
    document.body.classList.remove('no-scroll');
    // Force reflow so the browser repaints the newly-visible section
    try { void (target as HTMLElement).offsetWidth; } catch(e) { /* noop */ }
    // Eliminar enfoque automático para evitar scroll inesperado
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch(e) { /* noop */ }
    // Update URL hash to keep history in sync (use replaceState to avoid extra entry)
    try { history.replaceState(null, '', `#${id}`); } catch(e) { try { location.hash = id; } catch(e) { /* noop */ } }
    // Gentle smooth scroll, then ensure we end up exactly at the page top
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0,0); }
    // After layout settles, force immediate top to override any browser auto-scroll
    setTimeout(() => { try { window.scrollTo(0,0); } catch(e) { /* noop */ } }, 60);
  }
}

// When user clicks the confirm button in the confirmation screen, show only the form
document.querySelectorAll('.confirm-btn').forEach(el => {
  el.addEventListener('click', (ev) => {
    const anchor = ev.currentTarget as HTMLAnchorElement;
    const href = anchor.getAttribute('href') || '';
    // If this confirm button points to an external URL, let the browser handle it (do not intercept)
    if (href.startsWith('http') || href.startsWith('//')) return;
    ev.preventDefault();
    // Update URL without firing hashchange, then show the form immediately
    try { history.pushState(null, '', '#form'); } catch (e) { try { location.hash = 'form'; } catch(e) { /* noop */ } }
    showOnlySection('form');
    const backBtn = document.getElementById('back-from-form') as HTMLElement | null;
    if (backBtn) backBtn.style.display = 'inline-block';
  });
});

// Back button on the form returns to the confirmation screen
const backFromFormBtn = document.getElementById('back-from-form');
if (backFromFormBtn) {
  backFromFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // Restore the main site sections as they were after closing the invitation
    showMainSections();
    (backFromFormBtn as HTMLElement).style.display = 'none';
  });
}

// Back button on the invitadosconfirmados section (same behavior as form back)
const backFromInvitadosBtn = document.getElementById('back-from-invitados');
if (backFromInvitadosBtn) {
  backFromInvitadosBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showMainSections();
    (backFromInvitadosBtn as HTMLElement).style.display = 'none';
  });
}

// Reusable helper to show the primary sections shown after invitation
function showMainSections() {
  const IDS_TO_SHOW = [
    'nos-casamos',
    'wedding-info',
    'confirmacion-asistencia',
    'rm-lago',
    'itinerario',
    'salon-celebraciones',
    'countdown-section',
    'celebracion',
    'spotify',
    'imagenesBoda'
  ];
  IDS_TO_SHOW.forEach(id => {
    const sec = document.getElementById(id);
    if (sec) {
      sec.removeAttribute('hidden');
      sec.style.display = 'flex';
      sec.classList.remove('hidden');
    }
  });
  // Reorder carousel-section to appear immediately before wedding-info
  try {
    const wedding = document.getElementById('wedding-info');
    const carousel = document.getElementById('carousel-section');
    if (wedding && carousel && wedding.parentNode) {
      wedding.parentNode.insertBefore(carousel, wedding);
    }
  } catch (e) { /* noop */ }
  // Asegura que el formulario esté oculto tras la invitación
  const formSection = document.getElementById('form');
  if (formSection) {
    formSection.style.display = 'none';
  }
}

async function getGuestsBackend() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching guests:', err);
    return null;
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = (form.querySelector("#name") as HTMLInputElement).value;
  const email = (form.querySelector("#email") as HTMLInputElement).value;
  const guests = parseInt((form.querySelector("#guests") as HTMLInputElement).value, 10);

  if (!name.trim()) {
    showModal("Por favor, introduce un nombre válido.");
    return;
  }

  // Check for duplicate name in backend
  const allGuests = await getGuestsBackend();
  if (allGuests === null) {
    showModal('No se pudo conectar con el servidor. Inténtalo más tarde.');
    return;
  }
  const normalized = normalizeName(name);
  if (allGuests.some((g: any) => normalizeName(g.name) === normalized)) {
    showModal("Ya se ha registrado el invitado");
    return;
  }

  const result = await saveGuestBackend({ name, email, guests });
  if (result.error) {
    showModal(result.error);
    return;
  }
  form.reset();
  showModal("¡Gracias por confirmar tu asistencia!");
});

// Show confirmed guests at /invitadosconfirmados
if (window.location.pathname.endsWith("/invitadosconfirmados")) {
  document.body.innerHTML = `<section class="full-screen"><h2>Invitados confirmados</h2><ul id="guest-list"></ul></section>`;
  const guestList = document.getElementById("guest-list");

  getGuestsBackend().then((guests) => {
    if (!guests || guests.length === 0) {
      guestList!.innerHTML = '<li>No hay invitados confirmados aún.</li>';
    } else {
      guestList!.innerHTML = guests.map((g: any) =>
        `<li style="margin-bottom:1em"><b>${g.name}</b> (${g.email}) - ${g.guests} invitado(s)
        <button class="btn btn-sm btn-danger" style="margin-left:1em;border-radius:1em" data-id="${g.id}">Eliminar</button></li>`
      ).join("");
    }
  });

  guestList!.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" && target.dataset.id) {
      await fetch(`${API_URL}/${target.dataset.id}`, { method: "DELETE" });
      getGuestsBackend().then((guests) => {
        if (!guests || guests.length === 0) {
          guestList!.innerHTML = '<li>No hay invitados confirmados aún.</li>';
        } else {
          guestList!.innerHTML = guests.map((g: any) =>
            `<li style="margin-bottom:1em"><b>${g.name}</b> (${g.email}) - ${g.guests} invitado(s)
            <button class="btn btn-sm btn-danger" style="margin-left:1em;border-radius:1em" data-id="${g.id}">Eliminar</button></li>`
          ).join("");
        }
      });
    }
  });
}

function normalizeName(name: string): string {
  return name
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}



function showModal(message: string) {
  const modalBody = document.querySelector('.modal-body');
  if (modalBody) modalBody.textContent = message;
  // @ts-ignore
  const modal = new bootstrap.Modal(document.getElementById('alertModal'));
  modal.show();
}

// Music control helper: creates audio element and floating toggle button
function ensureMusicControl() {
  if (document.getElementById('music-toggle')) return;
  try {
    // Add minimal styles for the floating button
    const styleId = 'music-control-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #music-toggle { position: fixed; right: 3%; bottom: 2%; width:2.3rem; height:2.3rem; border-radius:50%; background:#c17d23; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.18); z-index:9999; cursor:pointer; border:none; }
        #music-toggle:active { transform: scale(0.96); }
        #music-toggle i { font-size:1.2rem; }
      `;
      document.head.appendChild(style);
    }

    // Create audio element
    const audio = document.createElement('audio');
    audio.id = 'page-music';
    // Use the provided asset path; if spaces exist it's OK in src but encode if needed
    audio.src = '/mp3/Mon Amour.mp3';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.7;
    document.body.appendChild(audio);

    // Create toggle button
    const btn = document.createElement('button');
    btn.id = 'music-toggle';
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Reproducir / Pausar música';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-volume-high';
    btn.appendChild(icon);
    btn.addEventListener('click', () => {
      try {
        const a = document.getElementById('page-music') as HTMLAudioElement | null;
        if (!a) return;
        if (a.paused) {
          const p = a.play();
          if (p && typeof p.then === 'function') p.catch(()=>{});
          btn.setAttribute('aria-pressed', 'true');
          icon.className = 'fa-solid fa-volume-high';
          // user manually started playback -> clear any auto-resume marker
          try { delete a.dataset.wasPlayingBeforeHidden; } catch { }
        } else {
          a.pause();
          btn.setAttribute('aria-pressed', 'false');
          icon.className = 'fa-solid fa-volume-xmark';
          // user manually paused -> clear marker so we don't auto-resume on focus
          try { delete a.dataset.wasPlayingBeforeHidden; } catch { }
        }
      } catch (err) { /* noop */ }
    });
    // Reflect initial state (paused)
    icon.className = 'fa-solid fa-volume-high';
    // Append to body
    document.body.appendChild(btn);

    // When audio ends/starts update icon (keeps in sync)
    audio.addEventListener('play', () => { try { const ic = document.querySelector('#music-toggle i'); if (ic) ic.className = 'fa-solid fa-volume-high'; } catch { } });
    audio.addEventListener('pause', () => { try { const ic = document.querySelector('#music-toggle i'); if (ic) ic.className = 'fa-solid fa-volume-xmark'; } catch { } });
    // Pause/music control when page visibility or focus changes
    try {
      const handleHide = () => {
        try {
          if (!audio) return;
          if (!audio.paused) {
            // mark that audio was playing so we may resume on focus
            audio.dataset.wasPlayingBeforeHidden = 'true';
            audio.pause();
          }
        } catch { }
      };
      const handleShow = () => {
        try {
          if (!audio) return;
          if (audio.dataset.wasPlayingBeforeHidden === 'true') {
            const p = audio.play();
            if (p && typeof p.then === 'function') p.catch(()=>{});
            try { delete audio.dataset.wasPlayingBeforeHidden; } catch { }
          }
        } catch { }
      };
      document.addEventListener('visibilitychange', () => { if (document.hidden) handleHide(); else handleShow(); });
      window.addEventListener('blur', handleHide);
      window.addEventListener('focus', handleShow);
      window.addEventListener('pagehide', handleHide);
    } catch { }
  } catch (e) { console.error('Error creating music control', e); }
}




