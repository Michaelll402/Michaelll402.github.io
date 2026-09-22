import { motion } from "../webgl/store";

/* ============================================================================
   THE POINTER CONTROLLER
   ----------------------------------------------------------------------------
   Owns motion.pointer and motion.pointerVel and nothing else. One listener for
   the whole document, rAF-coalesced, no layout reads, no per-move allocation.

   Everything downstream damps these numbers itself. Nothing is allowed to bind
   a transform straight to the cursor: that is the difference between a rig and
   a mouse-follower.
   ========================================================================== */

export function initPointer() {
  if (motion.coarse) return () => {};

  let px = 0;
  let py = 0;
  let lx = 0;
  let ly = 0;
  let pending = false;
  let pendingFrame = 0;

  const flush = () => {
    pending = false;
    const dx = px - lx;
    const dy = py - ly;
    lx = px;
    ly = py;
    motion.pointer.x = px;
    motion.pointer.y = py;
    const speed = Math.min(1, Math.hypot(dx, dy) * 6);
    motion.pointerVel = motion.pointerVel * 0.8 + speed * 0.2;
  };

  const onMove = (e: PointerEvent) => {
    px = (e.clientX / window.innerWidth) * 2 - 1;
    py = (e.clientY / window.innerHeight) * 2 - 1;
    if (pending) return;
    pending = true;
    pendingFrame = requestAnimationFrame(flush);
  };

  // when the pointer leaves, the world drifts back to centre rather than freezing
  const onLeave = () => {
    px = 0;
    py = 0;
    if (!pending) {
      pending = true;
      pendingFrame = requestAnimationFrame(flush);
    }
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);

  return () => {
    cancelAnimationFrame(pendingFrame);
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
  };
}
