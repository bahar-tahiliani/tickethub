import { useEffect, useState } from 'react';

export default function CountdownTimer({ expiresAt, onExpire, label = 'Your seats are reserved for' }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(expiresAt) - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(expiresAt) - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) {
        clearInterval(interval);
        onExpire && onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const urgent = totalSeconds <= 60;

  return (
    <div
      className={`rounded-lg px-4 py-2.5 text-sm font-medium border flex items-center gap-2 ${
        urgent ? 'bg-crimson/10 border-crimson/40 text-crimson' : 'bg-marquee/10 border-marquee/40 text-marquee'
      }`}
    >
      <span>⏱</span>
      <span>
        {label} <strong className="tabular-nums">{minutes}:{seconds}</strong> minutes
      </span>
    </div>
  );
}
