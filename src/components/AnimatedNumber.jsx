import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const requestRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    if (value === previousValue.current) {
      return;
    }

    const startValue = displayValue;
    const endValue = value;
    const duration = 800; // ms

    const animate = (time) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const progress = time - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      const currentVal = Math.floor(startValue + (endValue - startValue) * ease);
      setDisplayValue(currentVal);

      if (progress < duration) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
        startTimeRef.current = null;
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
  }, [value, displayValue]);

  const delta = value - previousValue.current;

  return (
    <span className="animated-number-container">
      {displayValue}
      {delta !== 0 && (
        <span key={value} className={`score-delta ${delta > 0 ? "positive" : "negative"}`}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </span>
  );
}
