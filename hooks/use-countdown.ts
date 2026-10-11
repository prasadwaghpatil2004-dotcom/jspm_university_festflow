"use client";
import { useEffect, useState } from "react";

export function countdownParts(target: string | undefined, now: number) {
  const remaining = Math.max(0, target ? Date.parse(target) - now : 0);
  return {
    remaining,
    values: [
      Math.floor(remaining / 86400000),
      Math.floor(remaining / 3600000) % 24,
      Math.floor(remaining / 60000) % 60,
      Math.floor(remaining / 1000) % 60,
    ],
  };
}

export function useCountdown(target: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!target) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);
  return countdownParts(target, now);
}
