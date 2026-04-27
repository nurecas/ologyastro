import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { usePersonal } from '../store.js';
import {
  dateToJD, gmst, equatorialAtDate, PLANETS, AMPLITUDE_ARRAY,
} from '../../astro/ephemeris.js';
import { astrocartographyLines, splitOnSeam, latLonToXYZ } from '../../astro/astrocartography.js';
import { LAYERS, hexToRGB } from '../../astro/layers.js';
import { locationLabel } from '../../astro/geolabel.js';
import { PLANET_INFO, GOAL_PRESETS } from '../astro/interpretation.js';
import { searchLocation } from '../astro/geocode.js';

const DEG = Math.PI / 180;

// Planet → primary-layer color.
const PLANET_COLOR = (() => {
  const m = {};
  for (const p of PLANETS) m[p] = '#e8e5d5';
  LAYERS.forEach(L => {
    if (L.planets.length > 0) m[PLANETS[L.planets[0]]] = L.color;
  });
  return m;
})();

// Earth-texture shader + goal-weighted goodness tint.
//
// For each of 40 (planet, line) pairs we carry a weight uniform. The shader
// computes distance from the fragment's (lat, lon) to that line and sums
// weight*Gaussian(distance). That sum is used as a gold-tint alpha. Lines
// layout for `uGoalWeights[40]`: index = planet_index * 4 + line_type, where
// line_type = 0 MC, 1 IC, 2 ASC, 3 DSC.
const V = `
varying vec3 vNormalW;
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormalW  = normalize(mat3(modelMatrix) * normal);
  vUv       = uv;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
const F = `
precision highp float;
varying vec3 vNormalW;
varying vec2 vUv;
varying vec3 vWorldPos;
uniform sampler2D uTex;
uniform float uReady;
uniform float uPlanetRA[10];
uniform float uPlanetDec[10];
uniform float uGMST;

// 8 goals × 40 slots (10 planets × 4 line types) = 320 weights. Zeroed
// slots skip their contribution entirely (cheap).
uniform float uGoalWeights[320];
uniform vec3  uGoalColors[8];
uniform float uGoalsActive;
uniform float uGoalIntensity;

const float PI = 3.14159265358979323846;

void main() {
  vec3 n = normalize(vNormalW);
  vec3 base = uReady > 0.5 ? texture2D(uTex, vUv).rgb : vec3(0.05, 0.09, 0.20);

  // Brighten the NASA topo (dark greens + deep blues) so geography reads
  // clearly, while keeping a subtle shading cue for depth.
  vec3 lightDir = normalize(vec3(0.6, 0.3, 0.9));
  float l = max(dot(n, lightDir), 0.0);
  base = base * (0.75 + 0.45 * l);
  base = pow(base, vec3(0.82)); // gentle gamma lift for the darkest regions

  if (uGoalsActive > 0.5) {
    float lat = asin(clamp(n.y, -1.0, 1.0));
    // Geographic longitude (east-positive) matching the texture UV
    // convention. +X = Greenwich, -Z = +90° east, +Z = -90° west.
    float lon = atan(-n.z, n.x);

    // Pre-compute per-planet per-line proximity (40 values), reused by
    // every goal so we don't repeat trig 8× over.
    float m[40];
    for (int i = 0; i < 10; i++) {
      float ra  = uPlanetRA[i];
      float dec = uPlanetDec[i];
      float dMc = lon - (ra - uGMST); dMc = atan(sin(dMc), cos(dMc));
      float dIc = lon - (ra - uGMST + PI); dIc = atan(sin(dIc), cos(dIc));
      m[i*4 + 0] = exp(-pow(dMc, 2.0) * 16.0);
      m[i*4 + 1] = exp(-pow(dIc, 2.0) * 16.0);
      float cosH = -tan(dec) * tan(lat);
      if (abs(cosH) < 1.0) {
        float H = acos(clamp(cosH, -1.0, 1.0));
        float dA = lon - (ra - uGMST - H); dA = atan(sin(dA), cos(dA));
        float dD = lon - (ra - uGMST + H); dD = atan(sin(dD), cos(dD));
        m[i*4 + 2] = exp(-pow(dA, 2.0) * 14.0);
        m[i*4 + 3] = exp(-pow(dD, 2.0) * 14.0);
      } else {
        m[i*4 + 2] = 0.0;
        m[i*4 + 3] = 0.0;
      }
    }

    // Per-goal colored tint.
    vec3 tint = vec3(0.0);
    for (int g = 0; g < 8; g++) {
      float goodness = 0.0;
      for (int k = 0; k < 40; k++) {
        goodness += uGoalWeights[g * 40 + k] * m[k];
      }
      goodness = clamp(goodness * 0.55, 0.0, 1.2);
      tint += uGoalColors[g] * goodness;
    }
    base += tint * uGoalIntensity;
  }

  // Rim atmosphere.
  vec3 V_ = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, V_), 0.0), 2.5);
  base += vec3(0.35, 0.45, 0.75) * rim * 0.3;
  gl_FragColor = vec4(base, 1.0);
}
`;

export default function PersonalGlobe() {
  const natal    = usePersonal(s => s.natal);
  const openInfo = usePersonal(s => s.openInfo);

  const containerRef = useRef(null);
  const raycasterRef = useRef(null);
  const cameraRef    = useRef(null);
  const sceneRef     = useRef(null);
  const rendererRef  = useRef(null);
  const matRef       = useRef(null);
  const pinsGroupRef = useRef(null);
  const rotState     = useRef({ lon: 0, lat: 0.4, zoom: 2.6, dragging: false, px: 0, py: 0 });
  const [hover, setHover] = useState(null);

  // Which goals are active + mix blend for each.
  const [goals, setGoals] = useState(
    Object.fromEntries(GOAL_PRESETS.map(g => [g.id, g.id === 'career']))
  );
  const [intensity, setIntensity] = useState(1.0);

  // Pinned locations for comparison.
  const [pins, setPins] = useState([]); // [{name, lat, lon}]
  const [pinQuery, setPinQuery] = useState('');
  const [pinResults, setPinResults] = useState([]);
  const [pinLoading, setPinLoading] = useState(false);
  const pinDebounceRef = useRef(0);

  // Birth-time AstroCartography.
  const lines = useMemo(() => {
    const jd   = natal.jd;
    const G    = gmst(jd);
    const eqs  = equatorialAtDate(natal.utc);
    return eqs.map((e, i) => ({
      planet: PLANETS[i],
      color:  PLANET_COLOR[PLANETS[i]],
      lines:  astrocartographyLines(e.ra, e.dec, G),
    }));
  }, [natal]);

  // Compute hotspot labels for the side panel.
  const hotspots = useMemo(() => {
    const G = gmst(natal.jd);
    const eqs = equatorialAtDate(natal.utc);
    return eqs.map((e, i) => {
      const mcLon = lonDeg(e.ra - G);
      const icLon = lonDeg(e.ra - G + Math.PI);
      const pickLabel = (lon) => {
        const cands = [40, 0, -40].map(lat => ({ lat, label: locationLabel(lat, lon) }));
        return cands.find(c => c.label.startsWith('near ')) || cands[1];
      };
      return {
        planet: PLANETS[i],
        color: PLANET_COLOR[PLANETS[i]],
        mc: { lon: mcLon, ...pickLabel(mcLon) },
        ic: { lon: icLon, ...pickLabel(icLon) },
      };
    });
  }, [natal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080810);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 2.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    // iPad / touchscreen fix: without this, the browser interprets
    // drag-to-rotate gestures as page scrolling and the globe won't
    // respond. `touch-action: none` hands touch events entirely to our
    // pointer handlers.
    renderer.domElement.style.touchAction = 'none';
    rendererRef.current = renderer;

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Sphere.
    const placeholder = new THREE.DataTexture(new Uint8Array([15, 26, 56, 255]), 1, 1, THREE.RGBAFormat);
    placeholder.needsUpdate = true;
    const mat = new THREE.ShaderMaterial({
      vertexShader: V, fragmentShader: F,
      uniforms: {
        uTex:            { value: placeholder },
        uReady:          { value: 0 },
        uPlanetRA:       { value: new Array(10).fill(0) },
        uPlanetDec:      { value: new Array(10).fill(0) },
        uGMST:           { value: 0 },
        // 8 goals × 40 slots. Zero = that goal inactive or that line unused.
        uGoalWeights:    { value: new Array(320).fill(0) },
        // Colors come from GOAL_PRESETS in interpretation.js — filled in the
        // toggle effect below.
        uGoalColors:     { value: Array.from({ length: 8 }, () => new THREE.Vector3(1, 0.82, 0.42)) },
        uGoalsActive:    { value: 0 },
        uGoalIntensity:  { value: 1.0 },
      },
    });
    matRef.current = mat;

    // Plug in birth-time RA / Dec / GMST (fixed for the life of this chart).
    {
      const jd = natal.jd;
      const eqs = equatorialAtDate(natal.utc);
      mat.uniforms.uGMST.value = gmst(jd);
      const ra  = new Array(10).fill(0);
      const dec = new Array(10).fill(0);
      eqs.forEach((e, i) => { ra[i] = e.ra; dec[i] = e.dec; });
      mat.uniforms.uPlanetRA.value  = ra;
      mat.uniforms.uPlanetDec.value = dec;
    }
    const sphereGeo = new THREE.SphereGeometry(1, 96, 64);
    const sphere = new THREE.Mesh(sphereGeo, mat);
    scene.add(sphere);

    // Clean NASA land-shallow-topo texture: no graticule, no labels.
    const loader = new THREE.TextureLoader();
    const baseUrl = (import.meta.env.BASE_URL || '/');
    const tryChain = (urls, idx = 0) => {
      if (idx >= urls.length) return;
      loader.load(
        baseUrl + urls[idx],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          mat.uniforms.uTex.value = tex;
          mat.uniforms.uReady.value = 1;
        },
        undefined,
        () => tryChain(urls, idx + 1),
      );
    };
    // Personal build ships only earth_topo.jpg (233 KB) — the other two
    // fallbacks were ~1.1 MB of never-loaded ballast. A single retry is
    // kept in case of a transient fetch failure.
    tryChain(['earth_topo.jpg', 'earth_topo.jpg']);

    // Lines group — create once here, regenerate below.
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    // Pins group — user-added comparison points, synced by a useEffect below.
    const pinsGroup = new THREE.Group();
    scene.add(pinsGroup);
    pinsGroupRef.current = pinsGroup;

    // Birth marker dot, placed just above the outermost AstroCartography ring.
    const birthPos = latLonToXYZ(natal.birth.lonDeg * DEG, natal.birth.latDeg * DEG, 1.038);
    const birthMat = new THREE.MeshBasicMaterial({ color: 0xf5d680 });
    const birthDot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 20, 14), birthMat);
    birthDot.position.set(birthPos[0], birthPos[1], birthPos[2]);
    scene.add(birthDot);

    // Render lines. Store per-line userData for raycasting.
    const buildLines = () => {
      while (linesGroup.children.length) {
        const c = linesGroup.children.pop();
        c.geometry?.dispose?.();
        c.material?.dispose?.();
      }
      const radius = 1.005;
      for (const pk of lines) {
        const [r, g, b] = hexToRGB(pk.color);
        const col = new THREE.Color(r, g, b);
        const draw = (pts, weight, kind) => {
          if (!pts || pts.length < 2) return;
          const segs = splitOnSeam(pts);
          for (const seg of segs) {
            if (seg.length < 2) continue;
            const positions = new Float32Array(seg.length * 3);
            // Stagger radius per kind so MC/IC/ASC/DSC don't z-fight, and
            // keep the lines well above the sphere so interpolated chords
            // between sample points never dip into the mesh — especially
            // near the poles.
            const radiusOffset = { MC: 1.025, IC: 1.023, ASC: 1.022, DSC: 1.020 }[kind];
            for (let k = 0; k < seg.length; k++) {
              const [lon, lat] = seg[k];
              const p = latLonToXYZ(lon, lat, radiusOffset);
              positions[k * 3 + 0] = p[0];
              positions[k * 3 + 1] = p[1];
              positions[k * 3 + 2] = p[2];
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            // Two-pass render for clarity: a brighter core + a wider
            // translucent halo. Both share the same userData so either
            // gets hit by the click raycaster.
            const makeLine = (opacity, haloRadius) => {
              const m = new THREE.LineBasicMaterial({
                color: col,
                transparent: true,
                opacity,
                depthTest: true,
                depthWrite: false,
              });
              let g = geo;
              if (haloRadius) {
                const hPos = new Float32Array(positions.length);
                for (let k = 0; k < positions.length; k += 3) {
                  const px = positions[k], py = positions[k + 1], pz = positions[k + 2];
                  const len = Math.sqrt(px*px + py*py + pz*pz);
                  hPos[k]     = (px / len) * haloRadius;
                  hPos[k + 1] = (py / len) * haloRadius;
                  hPos[k + 2] = (pz / len) * haloRadius;
                }
                g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
              }
              const line = new THREE.Line(g, m);
              line.userData = { planet: pk.planet, line: kind, color: pk.color };
              return line;
            };

            // Halo — a visibly wider, fainter shell.
            const halo = makeLine(weight * 0.35, radiusOffset + 0.010);
            linesGroup.add(halo);
            // Core (thin, bright)
            const core = makeLine(Math.min(1, weight * 1.35));
            linesGroup.add(core);
          }
        };
        draw(pk.lines.mc,  0.95, 'MC');
        draw(pk.lines.ic,  0.70, 'IC');
        draw(pk.lines.asc, 0.85, 'ASC');
        draw(pk.lines.dsc, 0.65, 'DSC');
      }
    };
    buildLines();

    // Input handlers.
    const onDown = (e) => { rotState.current.dragging = true; rotState.current.px = e.clientX; rotState.current.py = e.clientY; };
    const onUp   = () => { rotState.current.dragging = false; };
    const onMove = (e) => {
      if (!rotState.current.dragging) return;
      const dx = e.clientX - rotState.current.px;
      const dy = e.clientY - rotState.current.py;
      rotState.current.px = e.clientX; rotState.current.py = e.clientY;
      rotState.current.lon -= dx * 0.005;
      rotState.current.lat = Math.max(-1.3, Math.min(1.3, rotState.current.lat + dy * 0.005));
    };
    const onWheel = (e) => { e.preventDefault(); rotState.current.zoom = Math.max(1.3, Math.min(6, rotState.current.zoom + e.deltaY * 0.003)); };

    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Click handler — raycast against linesGroup. Suppress if it was a drag.
    let downX = 0, downY = 0, wasDrag = false;
    const onPtrDown = (e) => { downX = e.clientX; downY = e.clientY; wasDrag = false; };
    const onPtrUp = (e) => {
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 5) wasDrag = true;
    };
    renderer.domElement.addEventListener('pointerdown', onPtrDown);
    renderer.domElement.addEventListener('pointerup', onPtrUp);

    const onClick = (e) => {
      if (wasDrag) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      raycaster.params.Line.threshold = 0.05; // ~ 2.9° of arc — easy to hit
      const hits = raycaster.intersectObjects(linesGroup.children, false);
      if (hits.length) {
        const obj = hits[0].object;
        const { planet, line } = obj.userData;
        openInfo({ kind: 'planetLine', planet, line, x: e.clientX, y: e.clientY });
        return;
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Hover tooltip for lines.
    const onHover = (e) => {
      if (rotState.current.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      raycaster.params.Line.threshold = 0.025;
      const hits = raycaster.intersectObjects(linesGroup.children, false);
      if (hits.length) {
        const { planet, line, color } = hits[0].object.userData;
        setHover({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          planet, line, color,
        });
      } else {
        setHover(null);
      }
    };
    renderer.domElement.addEventListener('pointermove', onHover);
    renderer.domElement.addEventListener('pointerleave', () => setHover(null));

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const animate = () => {
      const R = rotState.current;
      const x = R.zoom * Math.cos(R.lat) * Math.sin(R.lon);
      const y = R.zoom * Math.sin(R.lat);
      const z = R.zoom * Math.cos(R.lat) * Math.cos(R.lon);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerdown', onPtrDown);
      renderer.domElement.removeEventListener('pointerup', onPtrUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('pointermove', onHover);
      sphereGeo.dispose(); mat.dispose();
      birthMat.dispose(); birthDot.geometry.dispose();
      placeholder.dispose();
      if (mat.uniforms.uTex.value && mat.uniforms.uTex.value !== placeholder) {
        mat.uniforms.uTex.value.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [lines, natal, openInfo]);

  // Sync pin dots → 3D scene.
  useEffect(() => {
    const group = pinsGroupRef.current;
    if (!group) return;
    while (group.children.length) {
      const c = group.children.pop();
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
    pins.forEach((p) => {
      const [x, y, z] = latLonToXYZ(p.lon * DEG, p.lat * DEG, 1.042);
      // Core dot.
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      core.position.set(x, y, z);
      group.add(core);
      // Cyan halo.
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x79d0ff, transparent: true, opacity: 0.28 })
      );
      halo.position.set(x, y, z);
      group.add(halo);
    });
  }, [pins]);

  // Push per-goal weights + per-goal colors to the shader. Each active goal
  // gets its own 40-slot weight block; inactive goals are all zeros.
  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    const lineIdx = { MC: 0, IC: 1, ASC: 2, DSC: 3 };
    const weights = new Array(320).fill(0);
    const colors  = mat.uniforms.uGoalColors.value;
    let active = 0;
    GOAL_PRESETS.forEach((g, gi) => {
      if (gi >= 8) return; // guard
      if (!goals[g.id]) return; // block stays zero
      active += 1;
      const base = gi * 40;
      for (const { planet, line, w } of g.weights) {
        const pi = PLANETS.indexOf(planet);
        if (pi < 0) continue;
        weights[base + pi * 4 + lineIdx[line]] += w;
      }
      const [r, gg, b] = hexToRGB(g.color);
      colors[gi].set(r, gg, b);
    });
    mat.uniforms.uGoalWeights.value = weights;
    mat.uniforms.uGoalsActive.value = active > 0 ? 1 : 0;
    mat.uniforms.uGoalIntensity.value = intensity;
  }, [goals, intensity]);

  // Compute top 5 "sweet spots" on a 5°-resolution grid.
  const sweetSpots = useMemo(() => {
    const activeGoals = GOAL_PRESETS.filter(g => goals[g.id]);
    if (activeGoals.length === 0) return [];

    const jd = natal.jd;
    const G  = gmst(jd);
    const eqs = equatorialAtDate(natal.utc);
    const ra  = eqs.map(e => e.ra);
    const dec = eqs.map(e => e.dec);
    const lineIdx = { MC: 0, IC: 1, ASC: 2, DSC: 3 };
    const weights = new Array(40).fill(0);
    for (const g of activeGoals) {
      for (const { planet, line, w } of g.weights) {
        const pi = PLANETS.indexOf(planet);
        if (pi < 0) continue;
        weights[pi * 4 + lineIdx[line]] += w;
      }
    }

    const goodness = (latRad, lonRad) => {
      let s = 0;
      for (let i = 0; i < 10; i++) {
        let dMc = ((lonRad - (ra[i] - G)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        let dIc = ((lonRad - (ra[i] - G + Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        const mMc = Math.exp(-dMc * dMc * 16);
        const mIc = Math.exp(-dIc * dIc * 16);
        const cosH = -Math.tan(dec[i]) * Math.tan(latRad);
        let mAsc = 0, mDsc = 0;
        if (Math.abs(cosH) < 1) {
          const H = Math.acos(Math.max(-1, Math.min(1, cosH)));
          let dA = ((lonRad - (ra[i] - G - H)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          let dD = ((lonRad - (ra[i] - G + H)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          mAsc = Math.exp(-dA * dA * 14);
          mDsc = Math.exp(-dD * dD * 14);
        }
        s += weights[i * 4 + 0] * mMc
           + weights[i * 4 + 1] * mIc
           + weights[i * 4 + 2] * mAsc
           + weights[i * 4 + 3] * mDsc;
      }
      return s;
    };

    const N = 72, M = 36;
    const grid = new Array(M);
    for (let j = 0; j < M; j++) {
      grid[j] = new Array(N);
      const lat = (-Math.PI / 2) + (j + 0.5) * Math.PI / M;
      for (let i = 0; i < N; i++) {
        const lon = -Math.PI + (i + 0.5) * 2 * Math.PI / N;
        grid[j][i] = { lat, lon, g: goodness(lat, lon) };
      }
    }
    // Local maxima.
    const maxima = [];
    for (let j = 1; j < M - 1; j++) {
      for (let i = 0; i < N; i++) {
        const c = grid[j][i];
        const left  = grid[j][(i - 1 + N) % N];
        const right = grid[j][(i + 1) % N];
        const up    = grid[j - 1][i];
        const down  = grid[j + 1][i];
        if (c.g > 0.15 && c.g >= left.g && c.g >= right.g && c.g >= up.g && c.g >= down.g) {
          maxima.push(c);
        }
      }
    }
    maxima.sort((a, b) => b.g - a.g);
    // Keep only well-separated peaks.
    const kept = [];
    for (const m of maxima) {
      const tooClose = kept.some(k => {
        const dLat = m.lat - k.lat;
        const dLon = ((m.lon - k.lon + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        return Math.hypot(dLat, dLon) < 0.6; // ~35° of arc
      });
      if (!tooClose) kept.push(m);
      if (kept.length >= 6) break;
    }
    return kept.map(m => ({
      lat: m.lat * 180 / Math.PI,
      lon: m.lon * 180 / Math.PI,
      g: m.g,
      label: locationLabel(m.lat * 180 / Math.PI, m.lon * 180 / Math.PI),
    }));
  }, [goals, natal]);

  const activeGoalsList = GOAL_PRESETS.filter(g => goals[g.id]);

  // --- Location Compare --------------------------------------------------
  // For each pinned location, compute the goodness score for each active goal
  // and the sum (overall match). Same Gaussian / AstroCartography math as the
  // shader's glow and sweetSpots.
  const pinScores = useMemo(() => {
    if (pins.length === 0 || activeGoalsList.length === 0) return [];
    const jd = natal.jd;
    const G  = gmst(jd);
    const eqs = equatorialAtDate(natal.utc);
    const ra  = eqs.map(e => e.ra);
    const dec = eqs.map(e => e.dec);
    const lineIdx = { MC: 0, IC: 1, ASC: 2, DSC: 3 };

    const scoreFor = (latRad, lonRad, weights) => {
      let s = 0;
      for (let i = 0; i < 10; i++) {
        let dMc = ((lonRad - (ra[i] - G)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        let dIc = ((lonRad - (ra[i] - G + Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        const mMc = Math.exp(-dMc * dMc * 16);
        const mIc = Math.exp(-dIc * dIc * 16);
        const cosH = -Math.tan(dec[i]) * Math.tan(latRad);
        let mAsc = 0, mDsc = 0;
        if (Math.abs(cosH) < 1) {
          const H = Math.acos(Math.max(-1, Math.min(1, cosH)));
          let dA = ((lonRad - (ra[i] - G - H)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          let dD = ((lonRad - (ra[i] - G + H)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          mAsc = Math.exp(-dA * dA * 14);
          mDsc = Math.exp(-dD * dD * 14);
        }
        s += weights[i * 4 + 0] * mMc
           + weights[i * 4 + 1] * mIc
           + weights[i * 4 + 2] * mAsc
           + weights[i * 4 + 3] * mDsc;
      }
      return s;
    };

    // Pre-build weight vectors per active goal.
    const goalVecs = activeGoalsList.map(g => {
      const w = new Array(40).fill(0);
      for (const { planet, line, w: wt } of g.weights) {
        const pi = PLANETS.indexOf(planet);
        if (pi < 0) continue;
        w[pi * 4 + lineIdx[line]] += wt;
      }
      return { goal: g, weights: w };
    });

    return pins.map((pin) => {
      const latRad = pin.lat * DEG;
      const lonRad = pin.lon * DEG;
      const perGoal = goalVecs.map(({ goal, weights }) => ({
        goal,
        score: scoreFor(latRad, lonRad, weights),
      }));
      const total = perGoal.reduce((a, b) => a + b.score, 0);
      return { pin, perGoal, total };
    });
  }, [pins, goals, natal, activeGoalsList]);

  // Debounced pin search (Open-Meteo geocoding).
  useEffect(() => {
    clearTimeout(pinDebounceRef.current);
    const q = pinQuery.trim();
    if (q.length < 2) { setPinResults([]); return; }
    setPinLoading(true);
    pinDebounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchLocation(q);
        setPinResults(r.slice(0, 6));
      } catch { setPinResults([]); }
      finally { setPinLoading(false); }
    }, 300);
    return () => clearTimeout(pinDebounceRef.current);
  }, [pinQuery]);

  const addPin = (loc) => {
    const name = `${loc.name}${loc.country ? ', ' + loc.country : ''}`;
    const key = `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;
    setPins(ps => [
      ...ps.filter(p => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}` !== key),
      { name, lat: loc.latitude, lon: loc.longitude },
    ].slice(0, 5));
    setPinQuery('');
    setPinResults([]);
  };
  const removePin = (i) => setPins(ps => ps.filter((_, idx) => idx !== i));

  return (
    <div className="w-full h-full flex flex-col p-6 text-[#e6e6f0]">
      <header className="mb-2">
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
          Personal AstroCartography
        </h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          Coloured curves trace where each planet sat on one of the four
          angles at the moment you were born. The glow overlay is an
          ideal-place map for whichever life goals you check in the right
          panel — brighter regions favour the goals you've selected.{' '}
          <span className="text-[#f5d680]">Click any line to read what that
          planet on that angle traditionally means.</span> The gold dot marks
          your birth location. Drag to rotate, scroll to zoom.
        </p>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px] gap-4">
        <div className="relative bg-[#0a0a14] border border-white/5 rounded-md overflow-hidden">
          <div ref={containerRef} className="absolute inset-0" />
          {hover && (
            <div
              className="pointer-events-none absolute bg-[#0b0b15]/95 border border-white/10 rounded-md px-2 py-1.5 text-[11px] z-10"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              <div style={{ color: hover.color }}>
                {PLANET_INFO[hover.planet].glyph} {hover.planet}
              </div>
              <div className="text-[#9b9bbd]">{hover.line} line · click to read meaning</div>
            </div>
          )}
          {/* Legend */}
          <div className="absolute left-3 bottom-3 bg-[#0b0b15]/85 border border-white/10 rounded-md px-3 py-2 text-[11px] text-[#bfbfd6] leading-snug">
            <div className="text-[10px] tracking-[0.18em] uppercase text-[#6d6d88] mb-1">Line types</div>
            <div><span className="text-[#f5d680]">MC</span> — planet overhead</div>
            <div><span className="text-[#f5d680]">IC</span> — planet underfoot</div>
            <div><span className="text-[#f5d680]">ASC</span> — planet rising</div>
            <div><span className="text-[#f5d680]">DSC</span> — planet setting</div>
          </div>
        </div>

        {/* Right panel — Goals + Sweet Spots + Hotspots */}
        <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3 overflow-y-auto space-y-4">

          {/* Goals selector */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd]">
                Life Goals
              </div>
              <button
                onClick={() => setGoals(Object.fromEntries(GOAL_PRESETS.map(g => [g.id, false])))}
                className="text-[10px] text-[#6d6d88] hover:text-white uppercase tracking-wider"
                title="Turn all goals off"
              >clear</button>
            </div>
            <div className="space-y-1">
              {GOAL_PRESETS.map(g => (
                <div key={g.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setGoals(s => ({ ...s, [g.id]: !s[g.id] }))}
                    className="flex items-center gap-2 flex-1 text-left hover:bg-white/5 rounded px-1.5 py-1"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        background: goals[g.id] ? g.color : 'transparent',
                        border: `1px solid ${g.color}`,
                      }}
                    />
                    <span
                      className="text-[12px] leading-tight"
                      style={{ color: goals[g.id] ? g.color : '#a2a2bd' }}
                    >
                      {g.name}
                    </span>
                  </button>
                  <button
                    onClick={(e) =>
                      openInfo({
                        kind: 'goal', id: g.id, name: g.name, color: g.color,
                        description: g.description, weights: g.weights,
                        x: e.clientX, y: e.clientY,
                      })
                    }
                    className="text-[11px] text-[#6d6d88] hover:text-white px-1"
                    title="What this goal includes"
                  >ℹ</button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-[#9b9bbd]">
              <span>Glow</span>
              <input
                type="range"
                min="0.2" max="2" step="0.05"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="flex-1 spine-scrub"
              />
              <span className="text-[#f5d680] min-w-[28px] text-right">×{intensity.toFixed(2)}</span>
            </div>
          </section>

          {/* Sweet spots */}
          {sweetSpots.length > 0 && (
            <section>
              <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
                Best-Match Places
              </div>
              <div className="space-y-1">
                {sweetSpots.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-[12px]">
                    <span className="text-[#f5d680] w-4">{i + 1}.</span>
                    <span className="flex-1">{s.label}</span>
                    <span className="text-[#6d6d88] text-[10px]">
                      {fmtLonDeg(s.lon)} {s.lat >= 0 ? `${s.lat.toFixed(1)}°N` : `${(-s.lat).toFixed(1)}°S`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1 text-[10px] text-[#6d6d88] leading-snug">
                Peaks of the combined glow map for your checked goals — the
                regions on Earth where the selected planet-lines converge most.
              </div>
            </section>
          )}

          {activeGoalsList.length === 0 && (
            <div className="text-[11px] text-[#6d6d88] italic leading-snug">
              Check one or more goals above to light up the ideal-place map
              and see ranked best-match locations.
            </div>
          )}

          {/* Location comparison */}
          <section>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
              Compare Places
            </div>
            <div className="text-[10.5px] text-[#6d6d88] mb-2 leading-snug">
              Score any cities on the checked goals. Up to 5 at a time.
            </div>
            <div className="relative mb-2">
              <input
                type="text"
                value={pinQuery}
                onChange={(e) => setPinQuery(e.target.value)}
                className="form-input text-[12px] py-1.5"
                placeholder="Type a city…"
              />
              {pinQuery.trim().length >= 2 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#0b0b15] border border-white/10 rounded max-h-56 overflow-y-auto">
                  {pinLoading && <div className="px-2 py-1 text-[11px] text-[#9b9bbd]">Searching…</div>}
                  {!pinLoading && pinResults.length === 0 && (
                    <div className="px-2 py-1 text-[11px] text-[#6d6d88] italic">No matches</div>
                  )}
                  {!pinLoading && pinResults.map(r => (
                    <button
                      key={r.id}
                      onMouseDown={(e) => { e.preventDefault(); addPin(r); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-white/5"
                    >
                      <div className="text-[11.5px] text-[#e6e6f0]">
                        {r.name}{r.country ? `, ${r.country}` : ''}
                      </div>
                      <div className="text-[10px] text-[#6d6d88]">
                        {Math.abs(r.latitude).toFixed(1)}°{r.latitude >= 0 ? 'N' : 'S'} ·{' '}
                        {Math.abs(r.longitude).toFixed(1)}°{r.longitude >= 0 ? 'E' : 'W'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {pins.length === 0 && (
              <div className="text-[10.5px] text-[#6d6d88] italic leading-snug">
                Pinned cities appear on the globe as cyan dots and as a scored
                comparison below.
              </div>
            )}

            {pinScores.length > 0 && (
              <div className="space-y-2">
                {/* Sort pinScores by total descending for a clear "winner" */}
                {[...pinScores].sort((a, b) => b.total - a.total).map(({ pin, perGoal, total }, idx) => {
                  const origIdx = pins.findIndex(p => p.name === pin.name);
                  const maxScoreHere = Math.max(...pinScores.map(ps => ps.total), 0.0001);
                  return (
                    <div key={pin.name} className="bg-[#0b0b15] border border-white/10 rounded-md p-2">
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[#f5d680] text-[10.5px]">#{idx + 1}</span>
                          <span className="text-[12px] text-[#e6e6f0]">{pin.name}</span>
                        </div>
                        <button
                          onClick={() => removePin(origIdx)}
                          className="text-[#6d6d88] hover:text-[#ff6a6a] text-[13px] leading-none px-1"
                          title="Remove pin"
                        >×</button>
                      </div>
                      <div className="space-y-1">
                        {perGoal.map(pg => (
                          <div key={pg.goal.id}>
                            <div className="flex items-baseline justify-between text-[10.5px]">
                              <span style={{ color: pg.goal.color }}>{pg.goal.name}</span>
                              <span className="text-[#9b9bbd]">{pg.score.toFixed(2)}</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-0.5">
                              <div
                                className="h-full"
                                style={{
                                  width: `${Math.min(100, (pg.score / maxScoreHere) * 100)}%`,
                                  background: pg.goal.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-baseline justify-between text-[11px]">
                        <span className="text-[#9b9bbd]">Total</span>
                        <span className="text-[#f5d680]">{total.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Birth hotspots (always visible) */}
          <section>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
              Birth Hotspots
            </div>
            <div className="text-[10.5px] text-[#6d6d88] mb-2 leading-snug">
              Places where each planet sat overhead (MC) or underfoot (IC)
              at the exact moment of birth. Click any row for the meaning.
            </div>
            <div className="grid grid-cols-[18px_1fr_1fr] gap-x-2 text-[10px] tracking-[0.12em] uppercase text-[#6d6d88] pb-1 border-b border-white/5">
              <div></div>
              <div>MC</div>
              <div>IC</div>
            </div>
            {hotspots.map(h => (
              <div key={h.planet} className="grid grid-cols-[18px_1fr_1fr] gap-x-2 items-start pt-1.5">
                <button
                  className="text-[15px] text-left"
                  style={{ color: h.color }}
                  title={h.planet}
                  onClick={(e) => openInfo({ kind: 'planet', id: h.planet, x: e.clientX, y: e.clientY })}
                >
                  {PLANET_INFO[h.planet].glyph}
                </button>
                <button
                  className="text-[12px] leading-tight text-left hover:bg-white/5 rounded px-1"
                  onClick={(e) => openInfo({ kind: 'planetLine', planet: h.planet, line: 'MC', x: e.clientX, y: e.clientY })}
                >
                  <div style={{ color: h.color }}>{h.mc.label}</div>
                  <div className="text-[#6d6d88] text-[10px]">{fmtLonDeg(h.mc.lon)}</div>
                </button>
                <button
                  className="text-[12px] leading-tight text-left hover:bg-white/5 rounded px-1"
                  onClick={(e) => openInfo({ kind: 'planetLine', planet: h.planet, line: 'IC', x: e.clientX, y: e.clientY })}
                >
                  <div className="text-[#c8c8dd]">{h.ic.label}</div>
                  <div className="text-[#6d6d88] text-[10px]">{fmtLonDeg(h.ic.lon)}</div>
                </button>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function lonDeg(rad) {
  let d = (rad * 180) / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
function fmtLonDeg(d) {
  return `${Math.abs(d).toFixed(1)}° ${d >= 0 ? 'E' : 'W'}`;
}
