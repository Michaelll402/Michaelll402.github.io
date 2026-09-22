/** Choose before importing React/Three, not after paying for the GPU stack. */
export function renderingPolicy() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (reduced || connection?.saveData) return { renderer: 'static', tier: 'low' } as const;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (matchMedia('(pointer: coarse)').matches || innerWidth < 1024 || memory <= 4 || cores <= 4) {
    return { renderer: 'static', tier: 'low' } as const;
  }
  return { renderer: 'webgl', tier: memory <= 8 || cores <= 8 ? 'medium' : 'high' } as const;
}
