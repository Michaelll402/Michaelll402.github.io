export function summarizeNumbers(values) {
  const sorted = values.filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, median: null, min: null, max: null };
  const mid = Math.floor(sorted.length / 2);
  return { count: sorted.length, median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2, min: sorted[0], max: sorted.at(-1) };
}

export function frameSummary(intervals) {
  const sorted = intervals.filter(Number.isFinite).sort((a, b) => a - b);
  return { frames: sorted.length, ...summarizeNumbers(sorted), p95: sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] : null, over33ms: sorted.filter((v) => v > 33.34).length, over50ms: sorted.filter((v) => v > 50).length };
}

// This is deliberately not called TBT: the observation window is fixed, not Lighthouse's TTI window.
export function blockingAfterPaint(tasks, fcp) {
  if (typeof fcp !== 'number') return null;
  return tasks.filter((task) => task.startTime >= fcp).reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
}
