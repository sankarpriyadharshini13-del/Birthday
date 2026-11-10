'use client';
import { useEffect } from 'react';

const BALLOONS = [
  { left: '6%', color: '#FF4F81', delay: '0s', dur: '13s', size: 64 },
  { left: '20%', color: '#FFC233', delay: '3s', dur: '16s', size: 52 },
  { left: '36%', color: '#6CCBFF', delay: '1s', dur: '14s', size: 70 },
  { left: '52%', color: '#19B8A6', delay: '5s', dur: '17s', size: 56 },
  { left: '66%', color: '#FF4F81', delay: '2s', dur: '15s', size: 60 },
  { left: '80%', color: '#FFC233', delay: '6s', dur: '13s', size: 66 },
  { left: '92%', color: '#6CCBFF', delay: '4s', dur: '18s', size: 50 },
];

export default function Celebration({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let stop = false;
    let timer: ReturnType<typeof setInterval>;
    (async () => {
      const confetti = (await import('canvas-confetti')).default;
      const colors = ['#FFC233', '#FF4F81', '#6CCBFF', '#19B8A6', '#FFF7EC'];
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors });
      let n = 0;
      timer = setInterval(() => {
        if (stop || ++n > 10) return clearInterval(timer);
        confetti({ particleCount: 28, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors });
        confetti({ particleCount: 28, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors });
      }, 700);
    })();
    return () => { stop = true; clearInterval(timer); };
  }, [active]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {BALLOONS.map((b, i) => (
        <div key={i} className="absolute bottom-0 animate-rise opacity-0" style={{ left: b.left, animationDelay: b.delay, animationDuration: b.dur }}>
          <div className="relative" style={{ width: b.size, height: b.size * 1.25, background: b.color, borderRadius: '50% 50% 50% 50% / 58% 58% 42% 42%', boxShadow: 'inset -8px -10px 0 rgba(0,0,0,.12), inset 8px 8px 0 rgba(255,255,255,.25)' }}>
            <div className="absolute left-1/2 top-full h-20 w-px bg-paper/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
