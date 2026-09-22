import { VALUE_NOISE } from "./noise";

/* ============================================================================
   THE CENTREPIECE SHADER

   Every particle carries all five formations at once. The chapter uniform is a
   continuous float, so blending between formations costs one uniform write per
   frame and no CPU work at all — no attribute uploads, no re-tessellation, no
   allocation. Scroll moves the number; the GPU does the sculpture.

   Turbulence peaks halfway between two formations: the cloud scatters as it
   travels and re-forms as it arrives, which is what makes a morph feel like
   matter rather than interpolation.
   ========================================================================== */

export const CENTERPIECE_VERT = /* glsl */ `
attribute vec3 aT0;
attribute vec3 aT1;
attribute vec3 aT2;
attribute vec3 aT3;
attribute vec3 aT4;
attribute vec3 aT5;
attribute vec3 aRnd;   // x seed · y phase · z size

uniform float uTime;
uniform float uChapter;    // 0..4, continuous
uniform float uTurb;       // 0..1 transition turbulence
uniform float uReveal;     // 0..1 entrance
uniform float uSize;
uniform float uDpr;
uniform vec2  uPointer;    // -1..1
uniform float uPointerAmp;
uniform float uVelocity;   // signed scroll velocity, clamped

varying float vFade;
varying float vTwinkle;
varying float vDepth;

${VALUE_NOISE}

void main() {
  // ---- blend the five formations -----------------------------------------
  // weights are a triangular kernel, so only two are ever non-zero
  float c = uChapter;
  vec3 target =
      aT0 * max(0.0, 1.0 - abs(c - 0.0))
    + aT1 * max(0.0, 1.0 - abs(c - 1.0))
    + aT2 * max(0.0, 1.0 - abs(c - 2.0))
    + aT3 * max(0.0, 1.0 - abs(c - 3.0))
    + aT4 * max(0.0, 1.0 - abs(c - 4.0))
    + aT5 * max(0.0, 1.0 - abs(c - 5.0));

  // ---- flow: organic drift, strongest mid-transition ----------------------
  float t = uTime * 0.09;
  vec3 np = target * 0.42 + aRnd.x * 6.0;
  // two samples, not three: the third component is derived from the first two,
  // which is indistinguishable at this amplitude and a third cheaper
  float n1 = vnoise(np + vec3(0.0, 0.0, t));
  float n2 = vnoise(np.yzx * 1.13 + vec3(t, 5.2, 0.0));
  vec3 flow = vec3(n1, n2, (n1 - n2) * 0.72);
  // At rest the drift is almost nothing: these formations are diagrams, and a
  // diagram that shimmers is a haze. The scatter belongs to the transition.
  float amp = 0.018 + uTurb * 0.9;
  target += flow * amp;

  // ---- breathing ----------------------------------------------------------
  float breath = 1.0 + 0.018 * sin(uTime * 0.5 + aRnd.y);
  target *= breath;

  // ---- pointer: a soft repulsion, in object space, damped by the CPU ------
  vec2 d = target.xy - uPointer * 2.4;
  float dist = length(d);
  float push = exp(-dist * dist * 0.55) * uPointerAmp;
  target.xy += normalize(d + 0.0001) * push * 0.5;

  // The first live frame is already the finished formation. Movement enhances
  // the composition; an outward-shell intro must never gate its recognition.
  vec4 mv = modelViewMatrix * vec4(target, 1.0);

  // ---- size ---------------------------------------------------------------
  // stretch very slightly with scroll velocity: felt, not seen
  float vel = 1.0 + abs(uVelocity) * 0.22;
  float size = aRnd.z * uSize * vel * uDpr;
  // Clamped: a particle that drifts close to the near plane would otherwise
  // blow up into a white disc the size of a headline.
  gl_PointSize = min(size / max(1.2, -mv.z), 42.0 * uDpr);
  gl_Position = projectionMatrix * mv;

  // and it fades out as it approaches the camera rather than looming
  float nearFade = smoothstep(1.1, 2.4, -mv.z);

  vFade = nearFade;
  vTwinkle = 0.72 + 0.28 * sin(uTime * 1.7 + aRnd.y * 3.1);
  vDepth = clamp((-mv.z - 2.0) / 7.0, 0.0, 1.0);
}
`;

export const CENTERPIECE_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uNear;    // colour of the near, lit side
uniform vec3 uFar;     // colour of the far, cooler side
uniform vec3 uCore;    // what the hot centre resolves toward (white by night, ink by day)
uniform float uOpacity;

varying float vFade;
varying float vTwinkle;
varying float vDepth;

void main() {
  // a round sprite with a hot core and a soft falloff — no texture needed
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv);
  if (d > 0.25) discard;
  float core = exp(-d * 26.0);
  float halo = exp(-d * 5.0) * 0.5;
  float a = (core + halo) * vFade * vTwinkle * uOpacity;

  vec3 col = mix(uNear, uFar, vDepth);
  // the hot centre pushes toward white so bloom has something to catch
  col = mix(col, uCore, core * 0.45);

  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

/* ----------------------------------------------------------------------------
   FILAMENTS — the same blend, drawn as line segments, so the cloud reads as a
   structure. Alpha falls off with distance from the camera and drops to nothing
   mid-transition, when lines between two different diagrams would be nonsense.
   -------------------------------------------------------------------------- */
export const FILAMENT_VERT = /* glsl */ `
attribute vec3 aT0;
attribute vec3 aT1;
attribute vec3 aT2;
attribute vec3 aT3;
attribute vec3 aT4;
attribute vec3 aT5;

uniform float uTime;
uniform float uChapter;
uniform float uReveal;

varying float vDepth;

void main() {
  float c = uChapter;
  vec3 target =
      aT0 * max(0.0, 1.0 - abs(c - 0.0))
    + aT1 * max(0.0, 1.0 - abs(c - 1.0))
    + aT2 * max(0.0, 1.0 - abs(c - 2.0))
    + aT3 * max(0.0, 1.0 - abs(c - 3.0))
    + aT4 * max(0.0, 1.0 - abs(c - 4.0))
    + aT5 * max(0.0, 1.0 - abs(c - 5.0));

  target *= 1.0 + 0.018 * sin(uTime * 0.5);
  vec4 mv = modelViewMatrix * vec4(target * uReveal, 1.0);
  vDepth = clamp((-mv.z - 2.0) / 7.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const FILAMENT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
varying float vDepth;
void main() {
  gl_FragColor = vec4(uColor, uOpacity * (1.0 - vDepth * 0.8));
  #include <colorspace_fragment>
}
`;
