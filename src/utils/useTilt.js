import { useRef, useCallback } from 'react';

export function useTilt() {
  const ref = useRef(null);

  const handleMouseMove = useCallback((event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 6;
    const rotateY = (x - 0.5) * 6;
    el.style.transform = `perspective(var(--tilt-perspective, 800px)) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = '';
  }, []);

  return { ref, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}
