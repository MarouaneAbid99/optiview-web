import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { panoramaAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const MODULE_COLOR = {
  clients: '#22c55e',
  eyewear: '#3b82f6',
  lenses:  '#a855f7',
  atelier: '#f97316',
  desk:    '#ec4899',
  orders:  '#0d9488',
  '':      '#6b7280',
};

// ─── HotspotRect ──────────────────────────────────────────────────────────
function HotspotRect({ hotspot, left, top, width, height, onClick }) {
  const color = MODULE_COLOR[hotspot.module] || MODULE_COLOR[''];
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-hotspot="true"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left, top, width, height,
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer',
      }}
    >
      {/* Border + subtle fill */}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 6,
        border: `2px solid ${color}`,
        backgroundColor: hovered ? `${color}33` : `${color}14`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        transition: 'background-color 0.15s',
        display: 'block',
      }} />
      {/* Label pill at bottom-center */}
      <span style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        bottom: 4, whiteSpace: 'nowrap',
        padding: '2px 8px', borderRadius: 999,
        fontSize: 11, fontWeight: 700, color: '#fff',
        backgroundColor: color,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }}>
        {hotspot.label}
      </span>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 6;
const HEADER_H = 64;

export function PanoramaViewer({ storeId }) {
  const stageRef = useRef(null);
  const imgRef   = useRef(null);

  const [store, setStore]         = useState(null);
  const [hotspots, setHotspots]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [zoom, setZoom]           = useState(1);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [imgBox, setImgBox]       = useState({ width: 0, height: 0 });

  const panRef  = useRef({ x: 0, y: 0 });
  const ptr     = useRef({ down: false, movedEnough: false, onHotspot: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const lastPinchDist = useRef(null);
  const zoomRef = useRef(1);
  const imgBoxRef = useRef({ width: 0, height: 0 });

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { imgBoxRef.current = imgBox; }, [imgBox]);

  // Measure rendered image dimensions for hotspot positioning
  const measure = useCallback(() => {
    if (imgRef.current) {
      const box = { width: imgRef.current.clientWidth, height: imgRef.current.clientHeight };
      setImgBox(box);
      imgBoxRef.current = box;
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, store?.imageUrl]);

  // Load store data
  useEffect(() => {
    if (!storeId) return;
    panoramaAPI.getStore(storeId)
      .then((res) => { setStore(res.data); setHotspots(res.data.hotspots || []); })
      .catch((err) => console.error('Failed to load store:', err))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Clamp pan so image edges never escape the stage
  const clampPan = useCallback((nx, ny, z, box) => {
    if (z <= 1) return { x: 0, y: 0 };
    const maxX = (box.width  * (z - 1)) / 2;
    const maxY = (box.height * (z - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, []);

  // Non-passive wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => {
      const nz = Math.min(4, Math.max(1, parseFloat((z * factor).toFixed(3))));
      if (nz <= 1) { setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; }
      else setPan((p) => { const c = clampPan(p.x, p.y, nz, imgBoxRef.current); panRef.current = c; return c; });
      return nz;
    });
  }, [clampPan]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Mouse handlers ──
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const onHotspot = !!e.target.closest('[data-hotspot]');
    ptr.current = { down: true, movedEnough: false, onHotspot, startX: e.clientX, startY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
  };

  const handleMouseMove = (e) => {
    if (!ptr.current.down || ptr.current.onHotspot) return;
    if (zoomRef.current <= 1) return;
    const dx = e.clientX - ptr.current.startX;
    const dy = e.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      ptr.current.movedEnough = true;
      setIsPanning(true);
    }
    if (ptr.current.movedEnough) {
      const clamped = clampPan(ptr.current.startPanX + dx, ptr.current.startPanY + dy, zoomRef.current, imgBoxRef.current);
      setPan(clamped);
      panRef.current = clamped;
    }
  };

  const handleMouseUp = () => { ptr.current.down = false; setIsPanning(false); };

  // ── Touch handlers ──
  const pinchDist = (touches) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) { lastPinchDist.current = pinchDist(e.touches); ptr.current.down = false; return; }
    const t = e.touches[0];
    const onHotspot = !!e.target.closest('[data-hotspot]');
    ptr.current = { down: true, movedEnough: false, onHotspot, startX: t.clientX, startY: t.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = pinchDist(e.touches);
      if (lastPinchDist.current) {
        setZoom((z) => {
          const nz = Math.min(4, Math.max(1, z * (dist / lastPinchDist.current)));
          if (nz <= 1) { setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; }
          else setPan((p) => { const c = clampPan(p.x, p.y, nz, imgBoxRef.current); panRef.current = c; return c; });
          return nz;
        });
      }
      lastPinchDist.current = dist;
      return;
    }
    if (!ptr.current.down || ptr.current.onHotspot) return;
    if (zoomRef.current <= 1) return;
    const t = e.touches[0];
    const dx = t.clientX - ptr.current.startX;
    const dy = t.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) { ptr.current.movedEnough = true; setIsPanning(true); }
    if (ptr.current.movedEnough) {
      const clamped = clampPan(ptr.current.startPanX + dx, ptr.current.startPanY + dy, zoomRef.current, imgBoxRef.current);
      setPan(clamped);
      panRef.current = clamped;
    }
  };

  const handleTouchEnd = () => { lastPinchDist.current = null; ptr.current.down = false; setIsPanning(false); };

  const adjustZoom = (delta) => {
    setZoom((z) => {
      const nz = Math.min(4, Math.max(1, parseFloat((z + delta).toFixed(2))));
      if (nz <= 1) { setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; }
      else setPan((p) => { const c = clampPan(p.x, p.y, nz, imgBoxRef.current); panRef.current = c; return c; });
      return nz;
    });
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; zoomRef.current = 1; };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111827' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const shopLabel = user?.shop?.name || (user?.role === 'DEVELOPER' ? 'Developer' : '');

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#111827' }}>
      {/* Header */}
      <div style={{ height: HEADER_H, background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0, zIndex: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e40af', letterSpacing: '-0.3px' }}>OPTIVIEW</h1>
            {store && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>{store.name}</p>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {user && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' }}>{user.name}</p>
                {shopLabel && <p style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{shopLabel}</p>}
              </div>
            )}
            {user?.role === 'OPTICIAN' && (
              <>
                <button onClick={() => navigate('/employees')}
                  style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Employees
                </button>
                <button onClick={() => navigate('/settings')} title="Shop Settings"
                  style={{ padding: 7, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#374151' }}>
                  <SettingsIcon size={17} />
                </button>
              </>
            )}
            {user?.role === 'DEVELOPER' && (
              <button onClick={() => navigate('/admin')}
                style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Admin
              </button>
            )}
            <button onClick={() => navigate('/editor')}
              style={{ padding: '7px 14px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Edit Hotspots
            </button>
            <button onClick={logout} title="Logout"
              style={{ padding: 7, background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', flexShrink: 0 }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none', userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {store?.imageUrl ? (
          <>
            {/* Transform layer — pan + zoom */}
            <div style={{
              position: 'relative',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.08s ease-out',
              willChange: 'transform',
            }}>
              <img
                ref={imgRef}
                src={store.imageUrl}
                alt={store?.name || 'Shop'}
                onLoad={measure}
                draggable={false}
                style={{
                  display: 'block',
                  maxWidth: '100vw',
                  maxHeight: `calc(100vh - ${HEADER_H}px)`,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />

              {/* Hotspot rectangles over the rendered image */}
              {imgBox.width > 0 && hotspots.map((h) => (
                <HotspotRect
                  key={h.id}
                  hotspot={h}
                  left={h.x * imgBox.width}
                  top={h.y * imgBox.height}
                  width={h.w * imgBox.width}
                  height={h.h * imgBox.height}
                  onClick={() => {
                    if (ptr.current.movedEnough) return;
                    navigate(`/module/${h.module}`);
                  }}
                />
              ))}
            </div>

            {/* Zoom controls */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 20 }}>
              {[
                { label: '+', action: () => adjustZoom(0.25) },
                { label: '−', action: () => adjustZoom(-0.25) },
                { label: '↺', action: resetView },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); action(); }}
                  style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', fontSize: label === '↺' ? 16 : 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827' }}>
                  {label}
                </button>
              ))}
              <div style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6, padding: '3px 6px', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>
                {Math.round(zoom * 100)}%
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>No shop image yet.</p>
            <button onClick={() => navigate('/editor')}
              style={{ padding: '9px 22px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Add an image in the editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
