// Countdown TypeScript module (vanilla, sin dependencias)
// Fecha objetivo (configurable): usa formato ISO o Date(...)
export const TARGET_DATE = new Date('2027-02-06T13:00:00');

const daysEl = document.getElementById('days') as HTMLElement | null;
const hoursEl = document.getElementById('hours') as HTMLElement | null;
const minutesEl = document.getElementById('minutes') as HTMLElement | null;
const secondsEl = document.getElementById('seconds') as HTMLElement | null;

const pad = (n: number) => String(n).padStart(2, '0');

function calcRemaining(target: Date) {
  const now = new Date();
  let diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= days * (1000 * 60 * 60 * 24);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * (1000 * 60 * 60);
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * (1000 * 60);
  const seconds = Math.floor(diff / 1000);
  return { days, hours, minutes, seconds };
}

function ensureStacks(el: HTMLElement, initial: string) {
  let cur = el.querySelector('.current') as HTMLElement | null;
  let nxt = el.querySelector('.next') as HTMLElement | null;
  if (!cur || !nxt) {
    // wrap existing content (or initial) into two spans
    const curVal = (el.querySelector('span')?.textContent) ?? initial;
    el.innerHTML = '';
    cur = document.createElement('span'); cur.className = 'current'; cur.textContent = curVal;
    nxt = document.createElement('span'); nxt.className = 'next'; nxt.textContent = curVal;
    el.appendChild(cur);
    el.appendChild(nxt);
  }
  return { cur, nxt };
}

function animateVertical(el: HTMLElement | null, newValRaw: number | string, padFlag = true) {
  if (!el) return;
  const newVal = padFlag ? pad(Number(newValRaw)) : String(newValRaw);
  const { cur, nxt } = ensureStacks(el, newVal);
  if (cur.textContent === newVal) return;
  // set next value and enforce starting transforms so motion is always upwards
  nxt.textContent = newVal;
  try {
    // reset inline transforms to ensure consistent start positions
    cur.style.transition = 'none';
    nxt.style.transition = 'none';
    cur.style.transform = 'translateY(0%) rotateX(0deg)';
    cur.style.opacity = '1';
    nxt.style.transform = 'translateY(100%) rotateX(12deg)';
    nxt.style.opacity = '0';
    // force reflow
    void el.offsetWidth;
  } catch (e) {
    // ignore if styles cannot be applied
  }
  // clear any inline transition overrides so CSS transition rules take effect
  requestAnimationFrame(() => {
    cur.style.transition = '';
    nxt.style.transition = '';
    el.classList.remove('slide-anim');
    void el.offsetWidth;
    el.classList.add('slide-anim');
  });
  // after transition, sync values and reset
  setTimeout(() => {
    cur.textContent = newVal;
    nxt.textContent = newVal;
    // clear inline styles to allow CSS defaults
    try {
      cur.style.transform = '';
      nxt.style.transform = '';
      cur.style.opacity = '';
      nxt.style.opacity = '';
      cur.style.transition = '';
      nxt.style.transition = '';
    } catch (e) {}
    el.classList.remove('slide-anim');
  }, 520);
}

function updateAll() {
  const r = calcRemaining(TARGET_DATE);
  // Animate all units vertically for a consistent hour-change feel
  animateVertical(daysEl, r.days, false);
  animateVertical(hoursEl, r.hours, true);
  animateVertical(minutesEl, r.minutes, true);
  animateVertical(secondsEl, r.seconds, true);
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  updateAll();
  setInterval(updateAll, 1000);
});
