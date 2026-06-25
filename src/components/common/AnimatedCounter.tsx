import { useEffect, useState } from "react";

export function AnimatedCounter({ value, duration = 800, prefix = "", suffix = "" }: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    if (endValue === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * (endValue - startValue) + startValue);
      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}
