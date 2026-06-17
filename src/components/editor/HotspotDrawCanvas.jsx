import { useState, useRef, useEffect } from 'react';

const MODULE_COLORS = {
  clients: 'rgba(34, 197, 94, 0.25)',
  eyewear: 'rgba(59, 130, 246, 0.25)',
  lenses:  'rgba(168, 85, 247, 0.25)',
  atelier: 'rgba(249, 115, 22, 0.25)',
  desk:    'rgba(236, 72, 153, 0.25)',
  '':      'rgba(156, 163, 175, 0.25)',
};

const MODULE_BORDERS = {
  clients: '#22c55e',
  eyewear: '#3b82f6',
  lenses:  '#a855f7',
  atelier: '#f97316',
  desk:    '#ec4899',
  '':      '#9ca3af',
};

export function HotspotDrawCanvas({ imageUrl, hotspots, selectedHotspot, onDrawComplete, onSelectHotspot }) {
  const imageRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);

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

  const getNorm = (clientX, clientY) => {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleMouseDown = (e) => {
    if (e.target.dataset.hotspot) return;
    e.preventDefault();
    const pos = getNorm(e.clientX, e.clientY);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
    onSelectHotspot(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    setDrawCurrent(getNorm(e.clientX, e.clientY));
  };

  const handleTouchStart = (e) => {
    if (e.target.dataset.hotspot) return;
    const t = e.touches[0];
    const pos = getNorm(t.clientX, t.clientY);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
    onSelectHotspot(null);
  };

  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const t = e.touches[0];
    setDrawCurrent(getNorm(t.clientX, t.clientY));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) { setIsDrawing(false); return; }
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    if (w > 0.02 && h > 0.02) {
      onDrawComplete({
        x: parseFloat(x.toFixed(4)),
        y: parseFloat(y.toFixed(4)),
        w: parseFloat(w.toFixed(4)),
        h: parseFloat(h.toFixed(4)),
      });
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const drawingRect = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return null;
    const x = Math.min(drawStart.x, drawCurrent.x) * imageSize.width;
    const y = Math.min(drawStart.y, drawCurrent.y) * imageSize.height;
    const w = Math.abs(drawCurrent.x - drawStart.x) * imageSize.width;
    const h = Math.abs(drawCurrent.y - drawStart.y) * imageSize.height;
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        border: '2px dashed #1e40af', background: 'rgba(30,64,175,0.12)',
        pointerEvents: 'none', boxSizing: 'border-box',
      }} />
    );
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', userSelect: 'none', cursor: 'crosshair', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Panorama"
        draggable={false}
        style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
      />

      {imageSize.width > 0 && hotspots.map((h) => {
        const left   = h.x * imageSize.width;
        const top    = h.y * imageSize.height;
        const width  = h.w * imageSize.width;
        const height = h.h * imageSize.height;
        const color  = MODULE_BORDERS[h.module] || MODULE_BORDERS[''];
        const isSelected = selectedHotspot === h.id;

        return (
          <div
            key={h.id}
            data-hotspot="true"
            onClick={(e) => { e.stopPropagation(); onSelectHotspot(h.id); }}
            style={{
              position: 'absolute', left, top, width, height, boxSizing: 'border-box',
              background: MODULE_COLORS[h.module] || MODULE_COLORS[''],
              border: `2px solid ${color}`,
              outline: isSelected ? `3px solid ${color}` : 'none',
              outlineOffset: 2,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: isSelected ? 10 : 1,
              transition: 'outline 0.1s',
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
          </div>
        );
      })}

      {drawingRect()}
    </div>
  );
}
