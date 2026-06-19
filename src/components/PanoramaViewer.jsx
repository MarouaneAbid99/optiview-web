import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { panoramaAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ─── Module metadata ───────────────────────────────────────────────────────
const MODULE_LABELS = {
  desk:    { title: 'Desk',    subtitle: 'Business Overview' },
  clients: { title: 'Clients', subtitle: 'Manage Customers' },
  eyewear: { title: 'Eyewear', subtitle: 'Manage Frames' },
  lenses:  { title: 'Lenses',  subtitle: 'Manage Lenses' },
  atelier: { title: 'Atelier', subtitle: 'Manage Production' },
  orders:  { title: 'Orders',  subtitle: 'Sales & Orders' },
};

// ─── HotspotAnchor ────────────────────────────────────────────────────────
function HotspotAnchor({ hotspot, left, top, width, height, zoom, onClick }) {
  const meta = MODULE_LABELS[hotspot.module] || { title: hotspot.label || 'Open', subtitle: '' };
  const inv = 1 / zoom;
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
      {/* Nearly invisible click area — faint hover tint */}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 6, display: 'block',
        backgroundColor: hovered ? 'rgba(255,255,255,0.10)' : 'transparent',
        transition: 'background-color 0.15s',
      }} />

      {/* Anchor dot + floating label — centered, counter-scaled */}
      <span style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, -50%) scale(${inv})`,
        transformOrigin: 'center center',
        display: 'flex', alignItems: 'center', gap: 8,
        pointerEvents: 'none',
      }}>
        {/* Pulsing blue dot */}
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{
            position: 'absolute', width: 16, height: 16, borderRadius: '50%',
            backgroundColor: 'rgba(59,130,246,0.4)',
            animation: 'ping 1.4s ease-out infinite',
          }} />
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            backgroundColor: '#2563eb',
            border: '2px solid #fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            position: 'relative',
          }} />
        </span>

        {/* Floating label card */}
        <span style={{
          display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(4px)',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          padding: '4px 10px',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{meta.title}</span>
          {meta.subtitle && (
            <span style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.3 }}>{meta.subtitle}</span>
          )}
        </span>
      </span>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 6;
const HEADER_H = 64;

export function PanoramaViewer({ storeId }) {
  const stageRef = useRef(null);

  const [store, setStore]         = useState(null);
  const [hotspots, setHotspots]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural]     = useState({ w: 0, h: 0 });
  const [zoom, setZoom]           = useState(1);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Refs so event handlers always see latest values without stale closures
  const panRef    = useRef({ x: 0, y: 0 });
  const zoomRef   = useRef(1);
  const coverRef  = useRef({ w: 0, h: 0 });
  const stageRef2 = useRef({ w: 0, h: 0 });
  const ptr       = useRef({ down: false, movedEnough: false, onHotspot: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const pinch     = useRef({ active: false, startDist: 0, startZoom: 1 });

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Keep refs in sync
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Cover dimensions derived from natural image size + stage size
  const coverScale =
    natural.w && natural.h && stageSize.w && stageSize.h
      ? Math.max(stageSize.w / natural.w, stageSize.h / natural.h)
      : 1;
  const coverW = natural.w * coverScale;
  const coverH = natural.h * coverScale;

  useEffect(() => { coverRef.current = { w: coverW, h: coverH }; }, [coverW, coverH]);
  useEffect(() => { stageRef2.current = stageSize; }, [stageSize]);

  // Measure stage
  const measureStage = useCallback(() => {
    if (stageRef.current) {
      const s = { w: stageRef.current.clientWidth, h: stageRef.current.clientHeight };
      setStageSize(s);
      stageRef2.current = s;
    }
  }, []);

  useEffect(() => {
    measureStage();
    window.addEventListener('resize', measureStage);
    return () => window.removeEventListener('resize', measureStage);
  }, [measureStage]);

  // Load store
  useEffect(() => {
    if (!storeId) return;
    panoramaAPI.getStore(storeId)
      .then((res) => { setStore(res.data); setHotspots(res.data.hotspots || []); })
      .catch((err) => console.error('Failed to load store:', err))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Clamp pan so no black gap is ever revealed
  const clampPan = useCallback((x, y, z, cov, stage) => {
    const maxX = Math.max(0, (cov.w * z - stage.w) / 2);
    const maxY = Math.max(0, (cov.h * z - stage.h) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const canPan = useCallback((z, cov, stage) => {
    const maxX = Math.max(0, (cov.w * z - stage.w) / 2);
    const maxY = Math.max(0, (cov.h * z - stage.h) / 2);
    return maxX > 0 || maxY > 0;
  }, []);

  // Non-passive wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => {
      const nz = Math.min(4, Math.max(1, z + delta));
      zoomRef.current = nz;
      setPan((p) => {
        const c = clampPan(p.x, p.y, nz, coverRef.current, stageRef2.current);
        panRef.current = c;
        return c;
      });
      return nz;
    });
  }, [clampPan]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const onHotspot = !!e.target.closest('[data-hotspot]');
    ptr.current = { down: true, movedEnough: false, onHotspot, startX: e.clientX, startY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
  };

  const handleMouseMove = (e) => {
    if (!ptr.current.down || ptr.current.onHotspot) return;
    if (!canPan(zoomRef.current, coverRef.current, stageRef2.current)) return;
    const dx = e.clientX - ptr.current.startX;
    const dy = e.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      ptr.current.movedEnough = true;
      setIsPanning(true);
    }
    if (ptr.current.movedEnough) {
      const c = clampPan(ptr.current.startPanX + dx, ptr.current.startPanY + dy, zoomRef.current, coverRef.current, stageRef2.current);
      setPan(c);
      panRef.current = c;
    }
  };

  const handleMouseUp = () => { ptr.current.down = false; setIsPanning(false); };

  // Touch handlers
  const touchDist = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinch.current = { active: true, startDist: touchDist(e.touches), startZoom: zoomRef.current };
      ptr.current.down = false;
      return;
    }
    const t = e.touches[0];
    const onHotspot = !!e.target.closest('[data-hotspot]');
    ptr.current = { down: true, movedEnough: false, onHotspot, startX: t.clientX, startY: t.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinch.current.active) {
      const ratio = touchDist(e.touches) / pinch.current.startDist;
      const nz = Math.min(4, Math.max(1, pinch.current.startZoom * ratio));
      setZoom(nz);
      zoomRef.current = nz;
      setPan((p) => {
        const c = clampPan(p.x, p.y, nz, coverRef.current, stageRef2.current);
        panRef.current = c;
        return c;
      });
      return;
    }
    if (!ptr.current.down || ptr.current.onHotspot) return;
    if (!canPan(zoomRef.current, coverRef.current, stageRef2.current)) return;
    const t = e.touches[0];
    const dx = t.clientX - ptr.current.startX;
    const dy = t.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) { ptr.current.movedEnough = true; setIsPanning(true); }
    if (ptr.current.movedEnough) {
      const c = clampPan(ptr.current.startPanX + dx, ptr.current.startPanY + dy, zoomRef.current, coverRef.current, stageRef2.current);
      setPan(c);
      panRef.current = c;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) pinch.current.active = false;
    ptr.current.down = false;
    setIsPanning(false);
  };

  const adjustZoom = (delta) => {
    setZoom((z) => {
      const nz = Math.min(4, Math.max(1, parseFloat((z + delta).toFixed(2))));
      zoomRef.current = nz;
      setPan((p) => {
        const c = clampPan(p.x, p.y, nz, coverRef.current, stageRef2.current);
        panRef.current = c;
        return c;
      });
      return nz;
    });
  };

  const resetView = () => {
    setZoom(1); zoomRef.current = 1;
    setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 };
  };

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
  const panning = canPan(zoom, { w: coverW, h: coverH }, stageSize);

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#111827' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping  { 0% { transform: scale(1); opacity: 0.5; } 75%, 100% { transform: scale(2); opacity: 0; } }
      `}</style>

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
          background: '#111827',
          cursor: panning ? (isPanning ? 'grabbing' : 'grab') : 'default',
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
            {/* Hidden probe img — gets natural dimensions */}
            <img
              src={store.imageUrl}
              alt=""
              onLoad={(e) => setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ display: 'none' }}
            />

            {coverW > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: coverW, height: coverH,
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.08s ease-out',
                  backgroundImage: `url(${store.imageUrl})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  willChange: 'transform',
                }}
              >
                {/* Hotspot anchors */}
                {hotspots.map((h) => (
                  <HotspotAnchor
                    key={h.id}
                    hotspot={h}
                    left={h.x * coverW}
                    top={h.y * coverH}
                    width={h.w * coverW}
                    height={h.h * coverH}
                    zoom={zoom}
                    onClick={() => {
                      if (ptr.current.movedEnough) return;
                      navigate(`/module/${h.module}`);
                    }}
                  />
                ))}
              </div>
            )}

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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#9ca3af' }}>
            <div>
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
