import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import vert from '../shaders/field.vert.glsl?raw';
import frag from '../shaders/field.frag.glsl?raw';
import { useStore } from '../store.js';
import { AMPLITUDE_ARRAY, PLANETS } from '../astro/ephemeris.js';
import { LAYERS, hexToRGB } from '../astro/layers.js';

const DEG = Math.PI / 180;

export default function FieldView() {
  const containerRef = useRef(null);
  const materialRef  = useRef(null);
  const rafRef       = useRef(0);

  const longitudes = useStore(s => s.longitudes);
  const coherence  = useStore(s => s.coherence);
  const numTime    = useStore(s => s.numTime);
  const t          = useStore(s => s.t);
  const layers     = useStore(s => s.layers);
  const masterCoh  = useStore(s => s.masterCoherence);

  // Setup Three.js once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x080810, 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.Camera();

    const P = PLANETS.length;
    const tex = new THREE.DataTexture(longitudes, P, numTime, THREE.RedFormat, THREE.FloatType);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const cohTex = new THREE.DataTexture(coherence, numTime, 1, THREE.RedFormat, THREE.FloatType);
    cohTex.needsUpdate = true;
    cohTex.minFilter = THREE.LinearFilter;
    cohTex.magFilter = THREE.LinearFilter;

    const ampSum = AMPLITUDE_ARRAY.reduce((a, b) => a + Math.abs(b), 0);

    // Static layer mask / axis / color arrays (8 × 10 mask, 8 axis1, 8 axis2, 8 colors).
    const layerMask  = new Array(80).fill(0);
    const layerAxis1 = new Array(8).fill(-1);
    const layerAxis2 = new Array(8).fill(-1);
    const layerColor = new Array(8).fill(0).map(() => new THREE.Vector3(1, 1, 1));
    LAYERS.forEach((l, idx) => {
      for (const pi of l.planets) layerMask[idx * 10 + pi] = 1;
      layerAxis1[idx] = l.axes[0] != null ? l.axes[0] * DEG : -1;
      layerAxis2[idx] = l.axes[1] != null ? l.axes[1] * DEG : -1;
      const [r, g, b] = hexToRGB(l.color);
      layerColor[idx] = new THREE.Vector3(r, g, b);
    });

    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uPlanetTex:    { value: tex },
        uCoherenceTex: { value: cohTex },
        uAmp:          { value: AMPLITUDE_ARRAY.map(x => x) },
        uAmpSum:       { value: ampSum },
        uNumTime:      { value: numTime },
        uLayerMask:    { value: layerMask },
        uLayerAxis1:   { value: layerAxis1 },
        uLayerAxis2:   { value: layerAxis2 },
        uLayerColor:   { value: layerColor },
        uLayerOpacity: { value: new Array(8).fill(0) },
        uMasterCoh:    { value: 0 },
      },
    });
    materialRef.current = mat;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      tex.dispose(); cohTex.dispose();
      mat.dispose(); quad.geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to layer toggle / mix changes.
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const opacity = layers.map(l => (l.enabled ? l.mix : 0));
    mat.uniforms.uLayerOpacity.value = opacity;
    mat.uniforms.uMasterCoh.value = masterCoh ? 1 : 0;
  }, [layers, masterCoh]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: `${t * 100}%`,
          height: '1px',
          background: 'linear-gradient(to right, rgba(245,214,128,0) 0%, rgba(245,214,128,0.9) 50%, rgba(245,214,128,0) 100%)',
          boxShadow: '0 0 18px rgba(245,214,128,0.7)',
        }}
      />
      <ZodiacTicks />
    </div>
  );
}

function ZodiacTicks() {
  const SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  return (
    <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 flex text-[#aaa9c6]/60 text-[11px] font-serif tracking-widest select-none">
      {SIGNS.map((g, i) => (
        <div key={i} className="flex-1 text-center" style={{ lineHeight: '22px', textShadow: '0 0 6px rgba(0,0,0,0.6)' }}>
          {g}
        </div>
      ))}
    </div>
  );
}
