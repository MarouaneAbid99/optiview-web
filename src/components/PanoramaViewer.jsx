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

export function PanoramaViewer({ storeId }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [store, setStore] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Zoom + pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  // Track pointer-down position to distinguish click from drag
  const pointerDownPos = useRef({ x: 0, y: 0 });
  // Pinch-zoom tracking
  const lastPinchDist = useRef(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!storeId) return;
    panoramaAPI.getStore(storeId)
      .then((res) => {
        setStore(res.data);
        setHotspots(res.data.hotspots || []);
      })
      .catch((err) => console.error('Failed to load store:', err))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    const updateSize = () => {
      if (imgRef.current) {
        setImgSize({ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight });
      }
    };
    const img = imgRef.current;
    if (img) {
      if (img.complete) updateSize();
      img.addEventListener('load', updateSize);
    }
    window.addEventListener('resize', updateSize);
    return () => {
      if (img) img.removeEventListener('load', updateSize);
      window.removeEventListener('resize', updateSize);
    };
  }, [store?.imageUrl]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.min(5, Math.max(1, z + delta * z)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const startPan = (clientX, clientY) => {
    isPanning.current = true;
    pointerDownPos.current = { x: clientX, y: clientY };
    panStart.current = { x: clientX, y: clientY, panX: pan.x, panY: pan.y };
  };

  const movePan = (clientX, clientY) => {
    if (!isPanning.current) return;
    setPan({
      x: panStart.current.panX + (clientX - panStart.current.x),
      y: panStart.current.panY + (clientY - panStart.current.y),
    });
  };

  const endPan = () => { isPanning.current = false; };

  // Did the pointer move enough to count as a drag?
  const isDrag = (clientX, clientY) => {
    const dx = clientX - pointerDownPos.current.x;
    const dy = clientY - pointerDownPos.current.y;
    return Math.sqrt(dx * dx + dy * dy) > 5;
  };

  const pinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastPinchDist.current = pinchDist(e.touches);
    } else {
      startPan(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = pinchDist(e.touches);
      if (lastPinchDist.current) {
        const ratio = dist / lastPinchDist.current;
        setZoom((z) => Math.min(5, Math.max(1, z * ratio)));
      }
      lastPinchDist.current = dist;
    } else {
      movePan(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    lastPinchDist.current = null;
    endPan();
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const shopLabel = user?.shop?.name || (user?.role === 'DEVELOPER' ? 'Developer' : '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0 }}>
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

      {/* Image area — zoom + pan container */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', background: '#111827', position: 'relative', cursor: isPanning.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={(e) => { if (e.button === 0) startPan(e.clientX, e.clientY); }}
        onMouseMove={(e) => movePan(e.clientX, e.clientY)}
        onMouseUp={(e) => endPan()}
        onMouseLeave={() => endPan()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {store?.imageUrl ? (
          <>
            {/* Transformed layer */}
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
                  alt={store.name}
                  draggable={false}
                  style={{ maxWidth: '80vw', maxHeight: '80vh', height: 'auto', display: 'block', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', userSelect: 'none' }}
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
                      title={h.label}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDrag(e.clientX, e.clientY)) navigate(`/module/${h.module}`);
                      }}
                      style={{
                        position: 'absolute', left, top, width, height, boxSizing: 'border-box',
                        background: MODULE_COLORS[h.module] || MODULE_COLORS[''],
                        border: `2px solid ${color}`,
                        borderRadius: 4, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s', padding: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = (MODULE_COLORS[h.module] || 'rgba(156,163,175,0.20)').replace('0.20', '0.40'); }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = MODULE_COLORS[h.module] || MODULE_COLORS['']; }}
                    >
                      <span style={{
                        fontSize: Math.max(10, Math.min(15, width / 7)),
                        fontWeight: 700, color,
                        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        pointerEvents: 'none',
                        maxWidth: '90%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        padding: '2px 6px', background: 'rgba(255,255,255,0.75)', borderRadius: 3,
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
                { label: '+', action: () => setZoom((z) => Math.min(5, parseFloat((z + 0.3).toFixed(2)))) },
                { label: '−', action: () => setZoom((z) => Math.max(1, parseFloat((z - 0.3).toFixed(2)))) },
                { label: '↺',  action: resetView },
              ].map(({ label, action }) => (
                <button key={label} onClick={action}
                  style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: label === '↺' ? 16 : 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827' }}>
                  {label}
                </button>
              ))}
              {zoom !== 1 && (
                <div style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 6, padding: '2px 6px', fontSize: 11, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>No image set for this store.</p>
              <button onClick={() => navigate('/editor')}
                style={{ padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Open Editor to add an image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
