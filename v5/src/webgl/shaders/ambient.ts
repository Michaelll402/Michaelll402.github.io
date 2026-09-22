import { VALUE_NOISE } from "./noise";

/* ============================================================================
   THE AMBIENT FIELD
   ----------------------------------------------------------------------------
   Not a black background, and not a gradient-mesh wallpaper either. This is the
   volume the sculpture hangs in: a near-black base with two very soft pools of
   light that drift on noise, a vignette that holds the composition, and grain
   so the darks never band on an 8-bit display.

   It is drawn on the inside of a large sphere so the camera can move through it
   without the light ever sliding off the frame.
   ========================================================================== */

export const AMBIENT_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const AMBIENT_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uChapter;
uniform vec3  uBase;    // the near-black (or near-white) ground
uniform vec3  uGlowA;   // the warm pool
uniform vec3  uGlowB;   // the cool pool
uniform float uStrength;
uniform float uGrain;

varying vec3 vDir;

${VALUE_NOISE}

void main() {
  vec3 d = normalize(vDir);

  // two light pools, drifting slowly and independently on noise
  float t = uTime * 0.035;
  vec3 pa = normalize(vec3(-0.55 + sin(t * 0.7) * 0.12, 0.32, -0.75));
  vec3 pb = normalize(vec3(0.62, -0.18 + cos(t * 0.9) * 0.14, -0.72));

  float ga = pow(max(0.0, dot(d, pa)), 7.0);
  float gb = pow(max(0.0, dot(d, pb)), 8.5);

  // low-frequency noise breaks the pools up so they read as atmosphere
  float n = vnoise(d * 1.9 + vec3(0.0, 0.0, t * 2.0)) * 0.5 + 0.5;
  ga *= 0.5 + n * 0.6;
  gb *= 0.5 + (1.0 - n) * 0.6;

  vec3 col = uBase + (uGlowA * ga + uGlowB * gb) * uStrength;

  // the horizon settles as the chapters progress: the world calms for reading
  col *= 1.0 - clamp(uChapter, 0.0, 4.0) * 0.045;

  // vignette in view space, so it always frames the camera
  float v = smoothstep(1.0, 0.15, length(d.xy));
  col *= 0.72 + v * 0.4;

  // grain, dithered — 8-bit darks band badly without it
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
  col += (g - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
