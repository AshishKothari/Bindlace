export function mean(xs) {
  if (xs.length === 0) return Number.NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function percentile(xs, p) {
  if (xs.length === 0) return Number.NaN;
  if (p <= 0) return Math.min(...xs);
  if (p >= 1) return Math.max(...xs);
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

