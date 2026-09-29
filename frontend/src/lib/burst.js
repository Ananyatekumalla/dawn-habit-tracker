/** Small confetti burst from an element. Skipped when the user prefers reduced motion. */
const COLORS = ['var(--sun)', 'var(--sky)', 'var(--rose)', 'var(--leaf)'];
const PARTICLES = 10;

export function burst(element) {
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < PARTICLES; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'burst';
    Object.assign(dot.style, { background: COLORS[i % COLORS.length], left: `${cx}px`, top: `${cy}px` });
    document.body.appendChild(dot);

    const angle = (Math.PI * 2 * i) / PARTICLES;
    const distance = 28 + Math.random() * 22;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    dot
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.2)`, opacity: 0 },
        ],
        { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' },
      )
      .finished.then(() => dot.remove());
  }
}
