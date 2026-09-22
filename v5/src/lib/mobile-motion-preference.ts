// The owner removed the in-site motion switch. Keep this small adapter so the
// approved animation controllers remain unchanged. They still independently
// honor reduced motion, save-data, visibility and scrolling constraints.
export const mobileMotionPaused = () => false;

export function initMobileMotionPreference() {
  // An old saved pause must not strand motion without a way to resume it.
  try { localStorage.removeItem('portfolio-mobile-motion-paused'); } catch { /* optional storage */ }
}
