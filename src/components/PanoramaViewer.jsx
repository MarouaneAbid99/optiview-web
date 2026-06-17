import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { panoramaAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const MODULE_COLORS = {
  clients: 'rgba(34, 197, 94, 0.20)',
  eyewear: 'rgba(59, 130, 246, 0.20)',
  lenses:  'rgba(168, 85, 247, 0.20)',
  atelier: 'rgba(249, 115, 22, 0.20)',
  desk:    'rgba(236, 72, 153, 0.20)',
  '':      'rgba(156, 163, 175, 0.20)',
};

const MODULE_BORDERS = {
  clients: '#22c55e',
  eyewear: '#3b82f6',
  lenses:  '#a855f7',
  atelier: '#f97316',
  desk:    '#ec4899',
  '':      '#9ca3af',
};

const DRAG_THRESHOLD = 6;

export function PanoramaViewer({ storeId }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [store, setStore] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Single ref tracks all pointer state — no stale closure issues
  const ptr = useRef({
    down: false,
    movedEnough: false,
    onHotspot: false,
    startX: 0, startY: 0,
    startPanX: 0, startPanY: 0,
  });
  const panRef = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => { panRef.current = pan; }, [pan]);

  useEffect(() => {
    if (!storeId) return;
    panoramaAPI.getStore(storeId)
      .then((res) => { setStore(res.data); setHotspots(res.data.hotspots || []); })
      .catch((err) => console.error('Failed to load store:', err))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleImgLoad = () => {
    if (imgRef.current) {
      setImgSize({ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight });
    }
  };

  useEffect(() => {
    const updateSize = () => {
      if (imgRef.current) setImgSize({ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight });
    };
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Wheel zoom — non-passive so we can preventDefault
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(5, Math.max(0.5, z * factor)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ---- Pointer handlers (mouse) ----
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    // Check if the actual target or any ancestor is a hotspot
    const onHotspot = !!e.target.closest('[data-hotspot]');
    ptr.current = {
      down: true,
      movedEnough: false,
      onHotspot,
      startX: e.clientX, startY: e.clientY,
      startPanX: panRef.current.x, startPanY: panRef.current.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!ptr.current.down || ptr.current.onHotspot) return;
    const dx = e.clientX - ptr.current.startX;
    const dy = e.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      ptr.current.movedEnough = true;
      setIsPanning(true);
    }
    if (ptr.current.movedEnough) {
      const newPan = { x: ptr.current.startPanX + dx, y: ptr.current.startPanY + dy };
      setPan(newPan);
      panRef.current = newPan;
    }
  };

  const handleMouseUp = () => {
    ptr.current.down = false;
    setIsPanning(false);
  };

  // ---- Touch handlers ----
  const pinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastPinchDist.current = pinchDist(e.touches);
      ptr.current.down = false; // cancel any active pan
      return;
    }
    const t = e.touches[0];
    const onHotspot = !!e.target.closest('[data-hotspot]');
    ptr.current = {
      down: true,
      movedEnough: false,
      onHotspot,
      startX: t.clientX, startY: t.clientY,
      startPanX: panRef.current.x, startPanY: panRef.current.y,
    };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = pinchDist(e.touches);
      if (lastPinchDist.current) {
        const ratio = dist / lastPinchDist.current;
        setZoom((z) => Math.min(5, Math.max(0.5, z * ratio)));
      }
      lastPinchDist.current = dist;
      return;
    }
    if (!ptr.current.down || ptr.current.onHotspot) return;
    const t = e.touches[0];
    const dx = t.clientX - ptr.current.startX;
    const dy = t.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      ptr.current.movedEnough = true;
      setIsPanning(true);
    }
    if (ptr.current.movedEnough) {
      const newPan = { x: ptr.current.startPanX + dx, y: ptr.current.startPanY + dy };
      setPan(newPan);
      panRef.current = newPan;
    }
  };

  const handleTouchEnd = () => {
    lastPinchDist.current = null;
    ptr.current.down = false;
    setIsPanning(false);
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }; };

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
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
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
              <button onClick={() => navigate('/employees')}
                style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Employees
              </button>
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
              style={{ padding: 7, background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen pan/zoom stage */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
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
            {/* Transformed layer — centered, then panned + scaled */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  ref={imgRef}
                  src={store.imageUrl}
                  alt={store.name || 'Shop'}
                  draggable={false}
                  onLoad={handleImgLoad}
                  style={{
                    display: 'block',
                    height: '85vh',
                    width: 'auto',
                    maxWidth: 'none',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />

                {imgSize.width > 0 && hotspots.map((h) => {
                  const left   = h.x * imgSize.width;
                  const top    = h.y * imgSize.height;
                  const width  = h.w * imgSize.width;
                  const height = h.h * imgSize.height;
                  const color  = MODULE_BORDERS[h.module] || MODULE_BORDERS[''];

                  return (
                    <button
                      key={h.id}
                      data-hotspot="true"
                      title={h.label}
                      onClick={() => {
                        // Only navigate if the pointer didn't drag
                        if (!ptr.current.movedEnough) navigate(`/module/${h.module}`);
                      }}
                      style={{
                        position: 'absolute', left, top, width, height,
                        boxSizing: 'border-box',
                        background: MODULE_COLORS[h.module] || MODULE_COLORS[''],
                        border: `2px solid ${color}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = (MODULE_COLORS[h.module] || 'rgba(156,163,175,0.20)').replace('0.20', '0.40'); }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = MODULE_COLORS[h.module] || MODULE_COLORS['']; }}
                    >
                      <span style={{
                        fontSize: Math.max(10, Math.min(15, width / 7)),
                        fontWeight: 700, color,
                        pointerEvents: 'none',
                        maxWidth: '90%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        padding: '2px 6px',
                        background: 'rgba(255,255,255,0.82)',
                        borderRadius: 3,
                        textShadow: 'none',
                      }}>
                        {h.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zoom controls */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
              {[
                { label: '+', action: () => setZoom((z) => Math.min(5, parseFloat((z * 1.25).toFixed(3)))) },
                { label: '−', action: () => setZoom((z) => Math.max(0.5, parseFloat((z / 1.25).toFixed(3)))) },
                { label: '↺', action: resetView },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  // stopPropagation prevents the container's mousedown from treating this as a pan start
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); action(); }}
                  style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', fontSize: label === '↺' ? 16 : 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827' }}>
                  {label}
                </button>
              ))}
              {zoom !== 1 && (
                <div style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6, padding: '3px 6px', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>
                  {Math.round(zoom * 100)}%
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ fontSize: 16, marginBottom: 12 }}>No shop image yet.</p>
              <button onClick={() => navigate('/editor')}
                style={{ padding: '9px 22px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Add an image in the editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
