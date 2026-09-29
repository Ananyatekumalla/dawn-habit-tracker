import { useEffect, useRef, useState } from 'react';

/** Animates a number from its previous value to `target`. */
export function useCountUp(target, durationMs = 600) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target) return undefined;
    const t0 = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = target;
    };
  }, [target, durationMs]);

  return value;
}
