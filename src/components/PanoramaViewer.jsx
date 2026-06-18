import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, Users, Glasses, Eye, Wrench, LayoutDashboard, ClipboardList, MapPin } from 'lucide-react';
import { panoramaAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ─── Module metadata ───────────────────────────────────────────────────────
const MODULE_META = {
  clients: { color: '#22c55e', Icon: Users },
  eyewear: { color: '#3b82f6', Icon: Glasses },
  lenses:  { color: '#a855f7', Icon: Eye },
  atelier: { color: '#f97316', Icon: Wrench },
  desk:    { color: '#ec4899', Icon: LayoutDashboard },
  orders:  { color: '#0d9488', Icon: ClipboardList },
  '':      { color: '#6b7280', Icon: MapPin },
};

// ─── HotspotPin ────────────────────────────────────────────────────────────
function HotspotPin({ hotspot, cx, cy, zoom, onClick }) {
  const { color, Icon } = MODULE_META[hotspot.module] || MODULE_META[''];
  const [hovered, setHovered] = useState(false);
  // Counter-scale so the pin keeps a comfortable size regardless of zoom
  const inv = 1 / zoom;

  return (
    <button
      data-hotspot="true"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `${cx}%`,
        top: `${cy}%`,
        transform: `translate(-50%, -50%) scale(${inv})`,
        transformOrigin: 'center center',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        zIndex: 10,
      }}
    >
      {/* Pulse ring */}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backgroundColor: color, opacity: 0.4,
        animation: 'pin-ping 1.5s ease-out infinite',
      }} />
      {/* Pin body */}
      <span style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: color, border: '2px solid #fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      }}>
        <Icon size={18} color="#fff" />
      </span>
      {/* Label — shows on hover */}
      <span style={{
        position: 'absolute', left: '50%', top: '100%', marginTop: 4,
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 4,
        fontSize: 12, fontWeight: 700, color: '#fff',
        backgroundColor: color,
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.15s',
        pointerEvents: 'none',
      }}>
        {hotspot.label}
      </span>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 6;

export function PanoramaViewer({ storeId }) {
  const stageRef = useRef(null);
  const [store, setStore]       = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [zoom, setZoom]         = useState(1);
  const [pan, setPan]           = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const panRef  = useRef({ x: 0, y: 0 });
  const ptr     = useRef({ down: false, movedEnough: false, onHotspot: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
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

  // Non-passive wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(5, Math.max(1, parseFloat((z * factor).toFixed(3)))));
  }, []);

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
  const handleMouseUp = () => { ptr.current.down = false; setIsPanning(false); };

  // ── Touch handlers ──
  const pinchDist = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

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
      if (lastPinchDist.current) setZoom((z) => Math.min(5, Math.max(1, z * (dist / lastPinchDist.current))));
      lastPinchDist.current = dist;
      return;
    }
    if (!ptr.current.down || ptr.current.onHotspot) return;
    const t = e.touches[0];
    const dx = t.clientX - ptr.current.startX;
    const dy = t.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) { ptr.current.movedEnough = true; setIsPanning(true); }
    if (ptr.current.movedEnough) { const newPan = { x: ptr.current.startPanX + dx, y: ptr.current.startPanY + dy }; setPan(newPan); panRef.current = newPan; }
  };
  const handleTouchEnd = () => { lastPinchDist.current = null; ptr.current.down = false; setIsPanning(false); };

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
      <style>{`
        @keyframes pin-ping {
          0%   { transform: scale(1);   opacity: 0.4; }
          75%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

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
              <>
                <button onClick={() => navigate('/employees')}
                  style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Employees
                </button>
                <button onClick={() => navigate('/settings')} title="Shop Settings"
                  style={{ padding: 7, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#374151' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}>
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
              style={{ padding: 7, background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stage — cover image + pins */}
      <div
        ref={stageRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#111827', cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
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
            {/* Transform layer — pan + zoom applied here */}
            <div style={{
              position: 'absolute', inset: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}>
              {/* Cover image */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${store.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }} />

              {/* Hotspot pins — centered on the rectangle center, as % of stage */}
              {hotspots.map((h) => (
                <HotspotPin
                  key={h.id}
                  hotspot={h}
                  cx={(h.x + h.w / 2) * 100}
                  cy={(h.y + h.h / 2) * 100}
                  zoom={zoom}
                  onClick={() => {
                    if (ptr.current.movedEnough) return;
                    navigate(`/module/${h.module}`);
                  }}
                />
              ))}
            </div>

            {/* Zoom controls — outside the transform layer, fixed position */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 20 }}>
              {[
                { label: '+', action: () => setZoom((z) => Math.min(5, parseFloat((z * 1.25).toFixed(3)))) },
                { label: '−', action: () => setZoom((z) => Math.max(1, parseFloat((z / 1.25).toFixed(3)))) },
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
