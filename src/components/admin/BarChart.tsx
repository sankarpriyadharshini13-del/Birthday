export default function BarChart({ title, data, color }: { title: string; data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  const w = 300, h = 100, gap = 2, bw = w / data.length - gap;
  return (
    <figure className="card">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-display text-lg font-bold">{title}</span>
        <span className="text-sm text-ink/60">{total} in the last {data.length} days</span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h + 16}`} className="mt-3 w-full" role="img" aria-label={`${title}, last ${data.length} days`}>
        {data.map((d, i) => {
          const bh = (d.value / max) * h;
          return (
            <g key={d.label}>
              <rect x={i * (bw + gap)} y={h - bh} width={bw} height={Math.max(bh, d.value ? 2 : 0.5)} rx="1.5" fill={color}><title>{`${d.label}: ${d.value}`}</title></rect>
            </g>
          );
        })}
        <text x="0" y={h + 12} fontSize="8" fill="#2A103399">{data[0]?.label}</text>
        <text x={w} y={h + 12} fontSize="8" textAnchor="end" fill="#2A103399">{data[data.length - 1]?.label}</text>
      </svg>
    </figure>
  );
}
