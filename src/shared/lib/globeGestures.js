// Pointer gestures shared by the two globes (the index GlobeView and the
// personal AstroCartography globe).
//
//   mouse drag / one finger   → rotate
//   mouse wheel / two fingers → zoom (pinch)
//
// `rot` is the component's mutable view state: { lon, lat, zoom, dragging,
// px, py }. `zoom` is the camera distance, so spreading two fingers apart
// makes it smaller. Mouse behaviour is the same as the handlers this
// replaces; touch gains pinch-zoom and no longer jumps when a second finger
// lands.
//
// `touch-action: none` hands touch input on the canvas to these handlers —
// without it the browser claims the gesture for page scrolling / page zoom
// and cancels the pointer mid-drag.

const ZOOM_MIN = 1.3;
const ZOOM_MAX = 6;
const LAT_MAX  = 1.3;
const clampZoom = (z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

export function attachGlobeGestures(el, rot) {
  el.style.touchAction = 'none';

  const pts = new Map();   // pointerId → { x, y } for every pointer currently down
  let spread = 0;          // finger spacing at the previous pinch frame, px

  const spacing = () => {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onDown = (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      rot.dragging = true; rot.px = e.clientX; rot.py = e.clientY;
    } else if (pts.size === 2) {
      rot.dragging = false;          // two fingers: zoom only, no rotation
      spread = spacing();
    }
  };

  const onMove = (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size >= 2) {
      const d = spacing();
      if (spread > 0 && d > 0) rot.zoom = clampZoom(rot.zoom * spread / d);
      spread = d;
      return;
    }
    if (!rot.dragging) return;
    const dx = e.clientX - rot.px;
    const dy = e.clientY - rot.py;
    rot.px = e.clientX; rot.py = e.clientY;
    rot.lon -= dx * 0.005;
    rot.lat = Math.max(-LAT_MAX, Math.min(LAT_MAX, rot.lat + dy * 0.005));
  };

  const onUp = (e) => {
    pts.delete(e.pointerId);
    spread = 0;
    if (pts.size === 1) {
      // One finger left after a pinch: carry on rotating from where it is.
      const [p] = [...pts.values()];
      rot.dragging = true; rot.px = p.x; rot.py = p.y;
    } else if (pts.size === 0) {
      rot.dragging = false;
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    rot.zoom = clampZoom(rot.zoom + e.deltaY * 0.003);
  };

  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    el.removeEventListener('wheel', onWheel);
  };
}

// Vertical field of view (degrees) that keeps a 45° view across the SHORTER
// side of the canvas, so the globe fits a portrait or square canvas (phones)
// as it does a landscape one. Landscape canvases keep the original 45°.
export function fitFov(aspect) {
  if (!(aspect > 0) || aspect >= 1) return 45;
  return 2 * Math.atan(Math.tan((45 / 2) * Math.PI / 180) / aspect) * 180 / Math.PI;
}
