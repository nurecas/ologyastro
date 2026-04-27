precision highp float;

varying vec2 vUv;

// 1D texture (width = 10 planets, height = numTime) of ecliptic longitudes in radians.
uniform sampler2D uPlanetTex;
uniform float     uAmp[10];
uniform float     uAmpSum;
uniform sampler2D uCoherenceTex;
uniform float     uNumTime;

// ---- Phase 2: 8 layer overlays -----------------------------------------
// For each layer: planet-inclusion mask (10 floats: 1.0 = include, else 0),
// up to 2 axis degrees (radians; -1.0 means unused), color, opacity.
uniform float uLayerMask[80];   // 8 layers × 10 planets
uniform float uLayerAxis1[8];
uniform float uLayerAxis2[8];
uniform vec3  uLayerColor[8];
uniform float uLayerOpacity[8]; // mix × enabled
uniform float uMasterCoh;       // 0 or 1

const float PI = 3.14159265358979323846;
const float TWO_PI = 6.28318530717958647692;

vec3 colormap(float n) {
  float t = clamp((n + 1.0) * 0.5, 0.0, 1.0);
  vec3 navy   = vec3(0.020, 0.025, 0.090);
  vec3 indigo = vec3(0.110, 0.060, 0.360);
  vec3 violet = vec3(0.490, 0.180, 0.780);
  vec3 rose   = vec3(0.980, 0.420, 0.620);
  vec3 gold   = vec3(1.000, 0.820, 0.420);
  vec3 c;
  if (t < 0.33)      c = mix(navy, indigo, t / 0.33);
  else if (t < 0.66) c = mix(indigo, violet, (t - 0.33) / 0.33);
  else if (t < 0.88) c = mix(violet, rose, (t - 0.66) / 0.22);
  else               c = mix(rose, gold, (t - 0.88) / 0.12);
  return c;
}

void main() {
  float theta = vUv.x * TWO_PI;
  float ty    = vUv.y;

  // Each horizontal row is exactly ONE moment in time — no shimmer, no drift.
  // The field is a pre-computed 2D map; the only thing that moves is the
  // user's scrubber cursor.
  float tSample = ty;

  // Sample all 10 planet longitudes.
  float phis[10];
  for (int i = 0; i < 10; i++) {
    float u = (float(i) + 0.5) / 10.0;
    phis[i] = texture2D(uPlanetTex, vec2(u, tSample)).r;
  }

  // Base interference field.
  float F = 0.0;
  for (int i = 0; i < 10; i++) {
    F += uAmp[i] * cos(theta - phis[i]);
  }
  float n = F / max(uAmpSum, 0.0001);
  vec3 col = colormap(n);

  // Coherence glow.
  float c = texture2D(uCoherenceTex, vec2(ty, 0.5)).r;
  float glow = smoothstep(0.65, 1.0, c);
  col += glow * 0.18 * vec3(0.95, 0.85, 0.55);

  // ---- Layer overlays --------------------------------------------------
  // For each of 8 layers, compute its sub-field, normalize, and additively
  // blend the layer's colour by (opacity × intensity × optional coherence).
  for (int L = 0; L < 8; L++) {
    float op = uLayerOpacity[L];
    if (op <= 0.001) continue;

    float Fl = 0.0;
    float amp = 0.0;
    for (int i = 0; i < 10; i++) {
      float mask = uLayerMask[L * 10 + i];
      Fl += mask * uAmp[i] * cos(theta - phis[i]);
      amp += mask * uAmp[i];
    }
    float a1 = uLayerAxis1[L];
    float a2 = uLayerAxis2[L];
    if (a1 >= 0.0) { Fl += 0.6 * cos(theta - a1); amp += 0.6; }
    if (a2 >= 0.0) { Fl += 0.6 * cos(theta - a2); amp += 0.6; }
    float nL = Fl / max(amp, 0.0001); // ~[-1, 1]

    // Only show constructive lobes — the signal of the layer.
    float intensity = smoothstep(0.05, 1.0, nL);

    float w = op * intensity;
    if (uMasterCoh > 0.5) w *= c;

    col += uLayerColor[L] * w * 0.85;
  }

  // Vignette at edges.
  float edge = 1.0 - smoothstep(0.0, 0.02, min(vUv.x, 1.0 - vUv.x));
  col = mix(col, col * 0.95, edge * 0.5);

  // Grain.
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
