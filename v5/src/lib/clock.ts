/** Small shared clock for active desktop pointer effects. No animation-library
 * startup and no scheduled frame when there is no subscriber or the tab hides. */
type Sub = (dt: number, now: number) => void;
const subscribers = new Set<Sub>();
let frame = 0;
let previous = 0;
function pump(time: number) {
  frame = 0;
  const dt = previous ? Math.min(.05, (time - previous) / 1000) : 1 / 60;
  previous = time;
  for (const subscriber of subscribers) subscriber(dt, time / 1000);
  schedule();
}
function schedule() {
  if (!frame && subscribers.size && !document.hidden) frame = requestAnimationFrame(pump);
}
function visibility() {
  cancelAnimationFrame(frame);
  frame = previous = 0;
  schedule();
}
export function onFrame(callback: Sub) {
  if (!subscribers.size) document.addEventListener('visibilitychange', visibility);
  subscribers.add(callback);
  schedule();
  return () => {
    subscribers.delete(callback);
    if (!subscribers.size) {
      cancelAnimationFrame(frame);
      frame = previous = 0;
      document.removeEventListener('visibilitychange', visibility);
    }
  };
}
