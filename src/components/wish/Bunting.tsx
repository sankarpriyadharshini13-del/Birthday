const COLORS = ['#FF6B9D', '#C44CFF', '#6B5BFF', '#FFC75F', '#4ECDC4'];

export default function Bunting() {
  const flags = Array.from({ length: 16 });
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 sm:h-14 md:h-16 w-full opacity-80" viewBox="0 0 1600 64" preserveAspectRatio="none">
      <path d="M0 8 Q800 48 1600 8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      {flags.map((_, i) => {
        const x = 40 + i * 100;
        const t = x / 1600;
        const y = 8 + 4 * (1 - t) * t * 40;
        return (
          <g key={i} style={{ animation: `float 3s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}>
            <path
              d={`M${x - 28} ${y} L${x + 28} ${y} L${x} ${y + 40} Z`}
              fill={COLORS[i % COLORS.length]}
              opacity="0.9"
            />
          </g>
        );
      })}
    </svg>
  );
}
