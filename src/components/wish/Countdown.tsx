const TILES = [
  'from-pink-500 to-rose-600',
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600'
];
const LABELS = ['Days', 'Hours', 'Minutes', 'Seconds'];

/** ms === null renders placeholders so server and client HTML match. */
export default function Countdown({ ms }: { ms: number | null }) {
  const s = ms === null ? null : Math.max(0, Math.floor(ms / 1000));
  const values = s === null
    ? ['--', '--', '--', '--']
    : [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'));

  return (
    <div role="timer" aria-label="Time until the birthday" className="mx-auto grid max-w-lg grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6">
      {values.map((v, i) => (
        <div
          key={LABELS[i]}
          className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br p-3 md:p-4 lg:p-6 shadow-2xl border border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-pink-500/30"
          style={{ background: `linear-gradient(135deg, ${TILES[i].replace('from-', '').replace(' to-', ', ')})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity" style={{ background: `linear-gradient(135deg, ${TILES[i]})` }} />
          <div className="relative font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tabular-nums leading-none text-white drop-shadow-lg">
            {v}
          </div>
          <div className="relative mt-1 md:mt-2 text-[10px] sm:text-xs md:text-sm font-semibold text-white/80 uppercase tracking-wider">
            {LABELS[i]}
          </div>
        </div>
      ))}
    </div>
  );
}
