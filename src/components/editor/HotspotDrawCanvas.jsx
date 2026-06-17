import { useState, useRef, useEffect, useCallback } from 'react';

const MODULE_COLORS = {
  clients: 'rgba(34, 197, 94, 0.25)',
  eyewear: 'rgba(59, 130, 246, 0.25)',
  lenses:  'rgba(168, 85, 247, 0.25)',
  atelier: 'rgba(249, 115, 22, 0.25)',
  desk:    'rgba(236, 72, 153, 0.25)',
  orders:  'rgba(13, 148, 136, 0.18)',
  '':      'rgba(156, 163, 175, 0.25)',
};

const MODULE_BORDERS = {
  clients: '#22c55e',
  eyewear: '#3b82f6',
  lenses:  '#a855f7',
  atelier: '#f97316',
  desk:    '#ec4899',
  orders:  '#0d9488',
  '':      '#9ca3af',
};

const RESIZE_HANDLE = 10; // px size of corner resize handle

// Clamp normalized value to [0,1]
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export function HotspotDrawCanvas({
  imageUrl, hotspots, selectedHotspot,
  onDrawComplete, onSelectHotspot, onUpdateHotspot,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Zoom + pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 }); // always in sync with state for use inside callbacks
  const zoomRef = useRef(1);
  const lastPinchDist = useRef(null);

  // Interaction mode: 'idle' | 'pan' | 'draw' | 'move' | 'resize'
  const interaction = useRef({ mode: 'idle', hotspotId: null, startMouse: null, startGeom: null });
  // Draw preview
  const [drawRect, setDrawRect] = useState(null);
  // Force re-render on interaction changes that affect cursor
  const [cursor, setCursor] = useState('crosshair');

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Update image size on load/resize
  useEffect(() => {
    const updateSize = () => {
      if (imageRef.current) {
        setImageSize({ width: imageRef.current.clientWidth, height: imageRef.current.clientHeight });
      }
    };
    const img = imageRef.current;
    if (img) {
      if (img.complete) updateSize();
      img.addEventListener('load', updateSize);
    }
    window.addEventListener('resize', updateSize);
    return () => {
      if (img) img.removeEventListener('load', updateSize);
      window.removeEventListener('resize', updateSize);
    };
  }, [imageUrl]);

  // Wheel zoom — attached with passive:false to allow preventDefault
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = clamp(zoomRef.current + delta * zoomRef.current, 0.5, 5);
    setZoom(newZoom);
    zoomRef.current = newZoom;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Convert client (page) coordinates to normalized image coordinates
  const clientToNorm = (clientX, clientY) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  };

  // Is (cx,cy) inside a hotspot's resize handle (bottom-right corner)?
  const hitResizeHandle = (h, cx, cy) => {
    if (!imageRef.current) return false;
    const rect = imageRef.current.getBoundingClientRect();
    const hx = rect.left + (h.x + h.w) * rect.width;
    const hy = rect.top  + (h.y + h.h) * rect.height;
    const handlePx = RESIZE_HANDLE / zoomRef.current;
    return Math.abs(cx - hx) < handlePx && Math.abs(cy - hy) < handlePx;
  };

  // Is (cx,cy) inside a hotspot body?
  const hitHotspot = (h, cx, cy) => {
    if (!imageRef.current) return false;
    const rect = imageRef.current.getBoundingClientRect();
    const l = rect.left + h.x * rect.width;
    const t = rect.top  + h.y * rect.height;
    const r = rect.left + (h.x + h.w) * rect.width;
    const b = rect.top  + (h.y + h.h) * rect.height;
    return cx >= l && cx <= r && cy >= t && cy <= b;
  };

  const pinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (e, fromTouch = false) => {
    const cx = fromTouch ? e.touches[0].clientX : e.clientX;
    const cy = fromTouch ? e.touches[0].clientY : e.clientY;

    if (!fromTouch && e.button !== 0) return;
    if (!fromTouch) e.preventDefault();

    // Check resize handle first (highest priority)
    for (const h of [...hotspots].reverse()) {
      if (hitResizeHandle(h, cx, cy)) {
        interaction.current = {
          mode: 'resize', hotspotId: h.id,
          startMouse: { x: cx, y: cy },
          startGeom: { x: h.x, y: h.y, w: h.w, h: h.h },
        };
        onSelectHotspot(h.id);
        setCursor('nwse-resize');
        return;
      }
    }

    // Check hotspot body (move)
    for (const h of [...hotspots].reverse()) {
      if (hitHotspot(h, cx, cy)) {
        interaction.current = {
          mode: 'move', hotspotId: h.id,
          startMouse: { x: cx, y: cy },
          startGeom: { x: h.x, y: h.y, w: h.w, h: h.h },
        };
        onSelectHotspot(h.id);
        setCursor('move');
        return;
      }
    }

    // Background: either draw or pan (if no image size yet → pan)
    if (imageSize.width > 0) {
      // Draw mode
      const norm = clientToNorm(cx, cy);
      interaction.current = { mode: 'draw', startNorm: norm };
      setDrawRect({ x: norm.x, y: norm.y, w: 0, h: 0 });
      onSelectHotspot(null);
      setCursor('crosshair');
    } else {
      interaction.current = {
        mode: 'pan',
        startMouse: { x: cx, y: cy },
        startPan: { ...panRef.current },
      };
      setCursor('grabbing');
    }
  };

  const handlePointerMove = (e, fromTouch = false) => {
    const cx = fromTouch ? e.touches[0].clientX : e.clientX;
    const cy = fromTouch ? e.touches[0].clientY : e.clientY;
    if (!fromTouch) e.preventDefault();

    const mode = interaction.current.mode;

    if (mode === 'pan') {
      const dx = cx - interaction.current.startMouse.x;
      const dy = cy - interaction.current.startMouse.y;
      const newPan = {
        x: interaction.current.startPan.x + dx,
        y: interaction.current.startPan.y + dy,
      };
      setPan(newPan);
      panRef.current = newPan;
      return;
    }

    if (mode === 'draw') {
      const norm = clientToNorm(cx, cy);
      const start = interaction.current.startNorm;
      setDrawRect({
        x: Math.min(start.x, norm.x),
        y: Math.min(start.y, norm.y),
        w: Math.abs(norm.x - start.x),
        h: Math.abs(norm.y - start.y),
      });
      return;
    }

    if (mode === 'move') {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const dxNorm = (cx - interaction.current.startMouse.x) / rect.width;
      const dyNorm = (cy - interaction.current.startMouse.y) / rect.height;
      const g = interaction.current.startGeom;
      const newX = clamp(g.x + dxNorm, 0, 1 - g.w);
      const newY = clamp(g.y + dyNorm, 0, 1 - g.h);
      onUpdateHotspot(interaction.current.hotspotId, {
        x: parseFloat(newX.toFixed(4)),
        y: parseFloat(newY.toFixed(4)),
      });
      return;
    }

    if (mode === 'resize') {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const dxNorm = (cx - interaction.current.startMouse.x) / rect.width;
      const dyNorm = (cy - interaction.current.startMouse.y) / rect.height;
      const g = interaction.current.startGeom;
      const newW = clamp(g.w + dxNorm, 0.02, 1 - g.x);
      const newH = clamp(g.h + dyNorm, 0.02, 1 - g.y);
      onUpdateHotspot(interaction.current.hotspotId, {
        w: parseFloat(newW.toFixed(4)),
        h: parseFloat(newH.toFixed(4)),
      });
    }
  };

  const handlePointerUp = (e, fromTouch = false) => {
    const cx = fromTouch ? (e.changedTouches?.[0]?.clientX ?? 0) : e.clientX;
    const cy = fromTouch ? (e.changedTouches?.[0]?.clientY ?? 0) : e.clientY;

    const mode = interaction.current.mode;

    if (mode === 'draw' && drawRect) {
      if (drawRect.w > 0.02 && drawRect.h > 0.02) {
        onDrawComplete({
          x: parseFloat(drawRect.x.toFixed(4)),
          y: parseFloat(drawRect.y.toFixed(4)),
          w: parseFloat(drawRect.w.toFixed(4)),
          h: parseFloat(drawRect.h.toFixed(4)),
        });
      }
      setDrawRect(null);
    }

    interaction.current = { mode: 'idle' };
    setCursor('crosshair');
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastPinchDist.current = pinchDist(e.touches);
      interaction.current = { mode: 'idle' };
      return;
    }
    handlePointerDown(e, true);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = pinchDist(e.touches);
      if (lastPinchDist.current) {
        const ratio = dist / lastPinchDist.current;
        const newZoom = clamp(zoomRef.current * ratio, 0.5, 5);
        setZoom(newZoom);
        zoomRef.current = newZoom;
      }
      lastPinchDist.current = dist;
      return;
    }
    handlePointerMove(e, true);
  };

  const handleTouchEnd = (e) => {
    lastPinchDist.current = null;
    handlePointerUp(e, true);
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Instruction */}
      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        Draw on empty space to create • Drag a hotspot to move • Drag the corner handle to resize • Scroll/pinch to zoom
      </p>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, background: '#1e293b', minHeight: 300, cursor }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Transformed layer */}
        <div style={{
          position: 'relative',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'top left',
          display: 'inline-block',
          willChange: 'transform',
        }}>
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Store"
            draggable={false}
            style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 8, userSelect: 'none' }}
          />

          {imageSize.width > 0 && hotspots.map((h) => {
            const left   = h.x * imageSize.width;
            const top    = h.y * imageSize.height;
            const width  = h.w * imageSize.width;
            const height = h.h * imageSize.height;
            const color  = MODULE_BORDERS[h.module] || MODULE_BORDERS[''];
            const isSelected = selectedHotspot === h.id;
            const handlePx = RESIZE_HANDLE / zoom;

            return (
              <div
                key={h.id}
                style={{
                  position: 'absolute', left, top, width, height, boxSizing: 'border-box',
                  background: MODULE_COLORS[h.module] || MODULE_COLORS[''],
                  border: `2px solid ${color}`,
                  outline: isSelected ? `3px solid ${color}` : 'none',
                  outlineOffset: 2,
                  cursor: 'move',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: isSelected ? 10 : 1,
                }}
              >
                <span style={{
                  fontSize: Math.max(10, Math.min(14, width / 8)),
                  fontWeight: 700, color, textAlign: 'center',
                  pointerEvents: 'none', padding: '2px 4px',
                  textShadow: '0 1px 3px rgba(255,255,255,0.8)',
                  maxWidth: '90%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {h.label || '(unnamed)'}
                </span>

                {/* Resize handle — bottom-right corner */}
                <div style={{
                  position: 'absolute',
                  right: -handlePx / 2, bottom: -handlePx / 2,
                  width: handlePx, height: handlePx,
                  background: color,
                  borderRadius: 2,
                  cursor: 'nwse-resize',
                  zIndex: 20,
                }} />
              </div>
            );
          })}

          {/* Draw preview */}
          {drawRect && drawRect.w > 0 && drawRect.h > 0 && (
            <div style={{
              position: 'absolute',
              left: drawRect.x * imageSize.width,
              top: drawRect.y * imageSize.height,
              width: drawRect.w * imageSize.width,
              height: drawRect.h * imageSize.height,
              border: '2px dashed #1e40af',
              background: 'rgba(30,64,175,0.12)',
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }} />
          )}
        </div>

        {/* Zoom controls — outside transform layer */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 20 }}>
          {[
            { label: '+', action: () => { const z = Math.min(5, zoomRef.current + 0.3); setZoom(z); zoomRef.current = z; } },
            { label: '−', action: () => { const z = Math.max(0.5, zoomRef.current - 0.3); setZoom(z); zoomRef.current = z; } },
            { label: '↺', action: resetView },
          ].map(({ label, action }) => (
            <button key={label} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); action(); }}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.9)', border: '1px solid #d1d5db', borderRadius: 6, fontSize: label === '↺' ? 14 : 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
