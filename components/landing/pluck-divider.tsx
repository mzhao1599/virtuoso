/**
 * Section divider: one pluck travelling along a delay line and dying away,
 * y = A·e^(−x/τ)·sin(2πx/λ), sampled once on the server into a static path.
 */
export function PluckDivider({ className }: { className?: string }) {
  const width = 480;
  const height = 24;
  const mid = height / 2;
  const points: string[] = [];
  for (let x = 0; x <= width; x += 2) {
    const envelope = 9 * Math.exp(-x / 110);
    const y = mid - envelope * Math.sin((2 * Math.PI * x) / 38);
    points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`);
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={points.join("")} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
