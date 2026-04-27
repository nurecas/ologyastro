import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store.js';
import {
  AMPLITUDE_ARRAY, PLANETS, decimalYearToDate,
  longitudesAtDate, equatorialAtDate, gmst, dateToJD,
} from '../astro/ephemeris.js';
import { LAYERS, hexToRGB } from '../astro/layers.js';
import { CITIES, cityPopAtYear } from '../astro/population.js';
import { astrocartographyLines, splitOnSeam, latLonToXYZ } from '../astro/astrocartography.js';

const DEG = Math.PI / 180;

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Layer-color per planet for the AstroCartography lines.
// Use layers where the planet is its primary, else white.
const PLANET_COLOR = (() => {
  const map = {};
  for (const p of PLANETS) map[p] = '#e8e5d5';
  LAYERS.forEach(L => {
    if (L.planets.length > 0) {
      const name = PLANETS[L.planets[0]];
      map[name] = L.color;
    }
  });
  return map;
})();

// ------------------------------------------------------------------------
// Earth shader using a real equirectangular Blue Marble texture + our
// own local-coherence tint (AstroCartography distance-field).
// ------------------------------------------------------------------------
const GLOBE_VERT = `
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormalW  = normalize(mat3(modelMatrix) * normal);
  vUv       = uv;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const GLOBE_FRAG = `
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;

uniform sampler2D uEarthTex;
uniform float     uTextureReady;  // 0 = fallback solid, 1 = texture loaded
uniform float uPlanetRA[10];
uniform float uPlanetDec[10];
uniform float uPlanetAmp[10];
uniform float uGMST;
uniform float uTime;

const float PI = 3.14159265358979323846;

void main() {
  vec3 n = normalize(vNormalW);
  // Geographic lat/lon matching the Three.js SphereGeometry UV convention
  // (east positive = -Z axis, so flip sign on n.z).
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lon = atan(-n.z, n.x);

  vec3 base;
  if (uTextureReady > 0.5) {
    // Use the geometry's built-in UVs — the standard Three.js SphereGeometry
    // unwrapping matches the convention of the Blue Marble texture
    // (u = 0.5 at Greenwich, v = 0 at north pole, with default flipY).
    base = texture2D(uEarthTex, vUv).rgb;
  } else {
    // Fallback while texture is still loading: plausible ocean blue.
    base = vec3(0.06, 0.10, 0.22);
  }

  // Simple day-lighting so the globe reads as 3D. Light is slightly off
  // axis from the camera so terminator is visible.
  vec3 lightDir = normalize(vec3(0.6, 0.35, 0.8));
  float l = max(dot(n, lightDir), 0.0);
  base *= (0.30 + 0.85 * l);

  // Local coherence amplitude from AstroCartography lines.
  float amplitude = 0.0;
  float totalAmp = 0.0;
  for (int i = 0; i < 10; i++) {
    float ra  = uPlanetRA[i];
    float dec = uPlanetDec[i];
    float amp = uPlanetAmp[i];
    totalAmp += amp;

    float dMc = lon - (ra - uGMST);
    dMc = atan(sin(dMc), cos(dMc));
    float dIc = lon - (ra - uGMST + PI);
    dIc = atan(sin(dIc), cos(dIc));
    float mMc = exp(-pow(dMc, 2.0) * 16.0);
    float mIc = exp(-pow(dIc, 2.0) * 16.0);

    float cosH = -tan(dec) * tan(lat);
    float aAsc = 0.0, aDsc = 0.0;
    if (abs(cosH) < 1.0) {
      float H = acos(clamp(cosH, -1.0, 1.0));
      float lonAsc = ra - uGMST - H;
      float lonDsc = ra - uGMST + H;
      float dA = lon - lonAsc; dA = atan(sin(dA), cos(dA));
      float dD = lon - lonDsc; dD = atan(sin(dD), cos(dD));
      aAsc = exp(-pow(dA, 2.0) * 14.0);
      aDsc = exp(-pow(dD, 2.0) * 14.0);
    }
    amplitude += amp * (mMc + mIc + aAsc + aDsc);
  }
  amplitude /= max(totalAmp, 0.0001);
  amplitude = clamp(amplitude, 0.0, 1.5);

  vec3 gold = vec3(1.0, 0.82, 0.42);
  base += gold * amplitude * 0.45;

  float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vWorldPos)), 0.0), 2.5);
  base += vec3(0.35, 0.45, 0.75) * rim * 0.35;

  gl_FragColor = vec4(base, 1.0);
}
`;

export default function GlobeView() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const rafRef = useRef(0);
  const rotState = useRef({ lon: 0, lat: 0.4, zoom: 2.6, dragging: false, px: 0, py: 0 });
  const matRef = useRef(null);
  const linesGroupRef = useRef(null);
  const citiesGroupRef = useRef(null);
  const sphereRef = useRef(null);
  const cameraRef = useRef(null);
  const hoverCtxRef = useRef({ jd: 0, eqs: [], longs: {}, gmst: 0 });
  const [hover, setHover] = React.useState(null);

  const t         = useStore(s => s.t);
  const startYear = useStore(s => s.startYear);
  const endYear   = useStore(s => s.endYear);

  const year = startYear + (endYear - startYear) * t;
  const date = useMemo(() => decimalYearToDate(year), [year]);

  // Initialize scene.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080810);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Sphere.
    const geometry = new THREE.SphereGeometry(1, 96, 64);

    // Placeholder texture (single dark-ocean pixel) until real one loads.
    const placeholder = new THREE.DataTexture(
      new Uint8Array([15, 26, 56, 255]), 1, 1, THREE.RGBAFormat
    );
    placeholder.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
      vertexShader: GLOBE_VERT,
      fragmentShader: GLOBE_FRAG,
      uniforms: {
        uEarthTex:     { value: placeholder },
        uTextureReady: { value: 0 },
        uPlanetRA:  { value: new Array(10).fill(0) },
        uPlanetDec: { value: new Array(10).fill(0) },
        uPlanetAmp: { value: AMPLITUDE_ARRAY.map(x => x) },
        uGMST:      { value: 0 },
        uTime:      { value: 0 },
      },
    });

    // Load the NASA Blue Marble texture from the local bundle. No network.
    const loader = new THREE.TextureLoader();
    loader.load(
      '/earth_blue_marble.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 8;
        material.uniforms.uEarthTex.value = tex;
        material.uniforms.uTextureReady.value = 1;
      },
      undefined,
      (err) => console.warn('earth texture failed to load', err),
    );
    matRef.current = material;
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;
    cameraRef.current = camera;

    // Background starfield (simple points).
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 30 + Math.random() * 5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3 + 0] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaaaacc, size: 0.09, sizeAttenuation: true }));
    scene.add(stars);

    // Line group + city group.
    const linesGroup = new THREE.Group();  scene.add(linesGroup);  linesGroupRef.current = linesGroup;
    const citiesGroup = new THREE.Group(); scene.add(citiesGroup); citiesGroupRef.current = citiesGroup;

    // Input: drag to rotate, wheel to zoom.
    const onDown = (e) => {
      rotState.current.dragging = true;
      rotState.current.px = e.clientX;
      rotState.current.py = e.clientY;
    };
    const onMove = (e) => {
      if (!rotState.current.dragging) return;
      const dx = e.clientX - rotState.current.px;
      const dy = e.clientY - rotState.current.py;
      rotState.current.px = e.clientX;
      rotState.current.py = e.clientY;
      rotState.current.lon -= dx * 0.005;
      rotState.current.lat = Math.max(-1.3, Math.min(1.3, rotState.current.lat + dy * 0.005));
    };
    const onUp = () => { rotState.current.dragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      rotState.current.zoom = Math.max(1.3, Math.min(6, rotState.current.zoom + e.deltaY * 0.003));
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Hover tooltip: raycast against the sphere to get lat/lon.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onHoverMove = (e) => {
      if (rotState.current.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, cameraRef.current);
      const hits = ray.intersectObject(sphereRef.current, false);
      if (hits.length === 0) { setHover(null); return; }
      const p = hits[0].point.clone().normalize();
      const lat = Math.asin(Math.max(-1, Math.min(1, p.y)));
      // east-positive longitude in the same convention as the texture UVs.
      const lon = Math.atan2(-p.z, p.x);

      const ctx = hoverCtxRef.current;
      const { eqs, gmst: G, longs } = ctx;
      if (!eqs.length) { setHover(null); return; }

      // Find nearest AstroCartography line among all planets/lines.
      let bestD = Infinity, bestPlanet = '', bestLine = '';
      eqs.forEach((e, i) => {
        const name = PLANETS[i];
        // MC
        let d = Math.abs(angDiff(lon, e.ra - G));
        if (d < bestD) { bestD = d; bestPlanet = name; bestLine = 'MC'; }
        // IC
        d = Math.abs(angDiff(lon, e.ra - G + Math.PI));
        if (d < bestD) { bestD = d; bestPlanet = name; bestLine = 'IC'; }
        // ASC/DSC at this latitude
        const cosH = -Math.tan(e.dec) * Math.tan(lat);
        if (Math.abs(cosH) < 1) {
          const H = Math.acos(cosH);
          d = Math.abs(angDiff(lon, e.ra - G - H));
          if (d < bestD) { bestD = d; bestPlanet = name; bestLine = 'ASC'; }
          d = Math.abs(angDiff(lon, e.ra - G + H));
          if (d < bestD) { bestD = d; bestPlanet = name; bestLine = 'DSC'; }
        }
      });

      // Compute MC-ecliptic longitude at this (lat, lon) and evaluate field.
      const eps = 23.4393 * DEG;
      const lst = G + lon;
      const mcLon = Math.atan2(Math.sin(lst), Math.cos(lst) * Math.cos(eps));
      const theta = (mcLon + Math.PI * 2) % (Math.PI * 2);
      let F = 0, ampSum = 0;
      for (let i = 0; i < PLANETS.length; i++) {
        const phi = (longs[PLANETS[i]] || 0) * DEG;
        F += AMPLITUDE_ARRAY[i] * Math.cos(theta - phi);
        ampSum += AMPLITUDE_ARRAY[i];
      }
      const localCoh = Math.abs(F) / ampSum;

      // Find dominant layer at this location.
      let bestL = null, bestV = -Infinity;
      for (const L of LAYERS) {
        let Fl = 0, amp = 0;
        for (const pi of L.planets) {
          const phi = (longs[PLANETS[pi]] || 0) * DEG;
          Fl += AMPLITUDE_ARRAY[pi] * Math.cos(theta - phi);
          amp += AMPLITUDE_ARRAY[pi];
        }
        for (const ax of L.axes) {
          Fl += 0.6 * Math.cos(theta - ax * DEG);
          amp += 0.6;
        }
        const n = Fl / Math.max(amp, 0.0001);
        if (n > bestV) { bestV = n; bestL = L; }
      }

      setHover({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        lat: (lat * 180 / Math.PI),
        lon: (lon * 180 / Math.PI),
        planet: bestPlanet,
        line: bestLine,
        coh: localCoh,
        layer: bestL ? bestL.name : '—',
        layerColor: bestL ? bestL.color : '#f5d680',
      });
    };
    const onHoverLeave = () => setHover(null);
    renderer.domElement.addEventListener('pointermove', onHoverMove);
    renderer.domElement.addEventListener('pointerleave', onHoverLeave);

    const onResize = () => {
      const W = container.clientWidth, H = container.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      const R = rotState.current;
      const x = R.zoom * Math.cos(R.lat) * Math.sin(R.lon);
      const y = R.zoom * Math.sin(R.lat);
      const z = R.zoom * Math.cos(R.lat) * Math.cos(R.lon);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      material.uniforms.uTime.value = performance.now() / 1000;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('pointermove', onHoverMove);
      renderer.domElement.removeEventListener('pointerleave', onHoverLeave);
      placeholder.dispose();
      if (material.uniforms.uEarthTex.value && material.uniforms.uEarthTex.value !== placeholder) {
        material.uniforms.uEarthTex.value.dispose();
      }
      geometry.dispose(); material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, []);

  // Update the hover context so onHoverMove sees the current frame's data.
  useEffect(() => {
    const jd = dateToJD(date);
    const eqs = equatorialAtDate(date);
    const G = gmst(jd);
    const longs = longitudesAtDate(date);
    hoverCtxRef.current = { jd, eqs, longs, gmst: G };
  }, [date]);

  // Update AstroCartography lines, planets RA/Dec uniforms, city dots as time changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !matRef.current) return;

    const jd = dateToJD(date);
    const GMST = gmst(jd);
    const eqs = equatorialAtDate(date);

    matRef.current.uniforms.uGMST.value = GMST;
    const raArr = new Array(10), decArr = new Array(10);
    eqs.forEach((e, i) => { raArr[i] = e.ra; decArr[i] = e.dec; });
    matRef.current.uniforms.uPlanetRA.value = raArr;
    matRef.current.uniforms.uPlanetDec.value = decArr;

    // Rebuild lines group.
    const group = linesGroupRef.current;
    while (group.children.length) {
      const c = group.children.pop();
      c.geometry && c.geometry.dispose();
      c.material && c.material.dispose();
    }
    const radius = 1.005;
    eqs.forEach((e, i) => {
      const name = PLANETS[i];
      const [r, g, b] = hexToRGB(PLANET_COLOR[name]);
      const col = new THREE.Color(r, g, b);
      const lines = astrocartographyLines(e.ra, e.dec, GMST);

      const drawPolyline = (pts, weight) => {
        if (pts.length < 2) return;
        const segs = splitOnSeam(pts);
        for (const seg of segs) {
          if (seg.length < 2) continue;
          const positions = new Float32Array(seg.length * 3);
          for (let k = 0; k < seg.length; k++) {
            const [lon, lat] = seg[k];
            const [x, y, z] = latLonToXYZ(lon, lat, radius);
            positions[k * 3 + 0] = x;
            positions[k * 3 + 1] = y;
            positions[k * 3 + 2] = z;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const mat = new THREE.LineBasicMaterial({
            color: col, transparent: true, opacity: weight,
          });
          const line = new THREE.Line(geo, mat);
          group.add(line);
        }
      };

      // MC/IC bolder; ASC/DSC lighter.
      drawPolyline(lines.mc, 0.85);
      drawPolyline(lines.ic, 0.55);
      drawPolyline(lines.asc, 0.55);
      drawPolyline(lines.dsc, 0.4);
    });

    // City dots: rebuild each tick.
    const cgroup = citiesGroupRef.current;
    while (cgroup.children.length) {
      const c = cgroup.children.pop();
      c.geometry && c.geometry.dispose();
      c.material && c.material.dispose();
    }
    const yr = year;
    const longsDeg = longitudesAtDate(date);
    // Find dominant layer at each city (by local field intensity).
    CITIES.forEach((city) => {
      const pop = cityPopAtYear(city, yr);
      if (pop <= 0) return;
      // Size proportional to sqrt(pop) (thousands).
      const size = 0.008 + Math.min(0.055, Math.sqrt(pop) * 0.0009);

      // Determine dominant layer by local coherence at that city.
      // Approximate: use city longitude as θ (wrapped 0..360).
      const theta = ((city.lon + 180) / 360) * 2 * Math.PI;
      let bestL = null, bestV = -1;
      for (const L of LAYERS) {
        const amps = AMPLITUDE_ARRAY;
        let F = 0, amp = 0;
        for (const pi of L.planets) {
          const phi = longsDeg[PLANETS[pi]] * DEG;
          F += amps[pi] * Math.cos(theta - phi);
          amp += amps[pi];
        }
        for (const ax of L.axes) {
          F += 0.6 * Math.cos(theta - ax * DEG);
          amp += 0.6;
        }
        const n = F / Math.max(amp, 0.0001);
        if (n > bestV) { bestV = n; bestL = L; }
      }
      const [r, g, b] = hexToRGB(bestL ? bestL.color : '#f5d680');

      const lat = city.lat * DEG;
      const lon = city.lon * DEG;
      const [x, y, z] = latLonToXYZ(lon, lat, 1.01);
      const dotGeo = new THREE.SphereGeometry(size, 12, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(x, y, z);
      dot.userData = { city: city.name, pop };
      cgroup.add(dot);

      // Glow halo.
      const haloGeo = new THREE.SphereGeometry(size * 2.2, 12, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(r, g, b), transparent: true, opacity: 0.22,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(x, y, z);
      cgroup.add(halo);
    });
  }, [date, year]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {hover && (
        <div
          className="pointer-events-none absolute bg-[#0b0b15]/95 border border-white/10 rounded-md px-2.5 py-2 text-[10px] tracking-wide text-[#e6e6f0] shadow-lg"
          style={{
            left: Math.min(hover.x + 14, 9999),
            top: hover.y + 14,
            maxWidth: 220,
          }}
        >
          <div className="text-[#9b9bbd] text-[9px] tracking-[0.22em] uppercase mb-1">
            {hover.lat >= 0 ? hover.lat.toFixed(1) + '°N' : (-hover.lat).toFixed(1) + '°S'}
            {' · '}
            {hover.lon >= 0 ? hover.lon.toFixed(1) + '°E' : (-hover.lon).toFixed(1) + '°W'}
          </div>
          <div>
            <span className="text-[#9b9bbd]">Nearest line: </span>
            <span className="text-[#f5d680]">{hover.planet} {hover.line}</span>
          </div>
          <div>
            <span className="text-[#9b9bbd]">Local coherence: </span>
            <span className="text-[#fff8dd]">{hover.coh.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-[#9b9bbd]">Strongest layer: </span>
            <span style={{ color: hover.layerColor }}>{hover.layer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
