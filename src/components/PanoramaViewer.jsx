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
      {/* Nearly-invisible clickable area */}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 6, display: 'block',
        backgroundColor: hovered ? 'rgba(255,255,255,0.10)' : 'transparent',
        transition: 'background-color 0.15s',
      }} />

      {/* Anchor dot + floating label — counter-scaled to stay constant size */}
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

        {/* Label card */}
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

  const panRef  = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const ptr     = useRef({ down: false, movedEnough: false, onHotspot: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const pinch   = useRef({ active: false, startDist: 0, startZoom: 1 });

  // Keep refs in sync so event handlers don't stale-close over state
  const stageSizeRef = useRef({ w: 0, h: 0 });
  const coverRef     = useRef({ w: 0, h: 0 });

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { stageSizeRef.current = stageSize; }, [stageSize]);

  // ResizeObserver — always reflects real rendered stage size
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const s = { w: el.clientWidth, h: el.clientHeight };
      setStageSize(s);
      stageSizeRef.current = s;
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update(); // initial
    return () => ro.disconnect();
  }, []); // run once; ResizeObserver handles all future changes

  // Load store
  useEffect(() => {
    if (!storeId) return;
    panoramaAPI.getStore(storeId)
      .then((res) => { setStore(res.data); setHotspots(res.data.hotspots || []); })
      .catch((err) => console.error('Failed to load store:', err))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Cover dimensions — recomputed on every render when inputs change
  const coverScale =
    natural.w && natural.h && stageSize.w && stageSize.h
      ? Math.max(stageSize.w / natural.w, stageSize.h / natural.h)
      : 0;
  const coverW = natural.w * coverScale;
  const coverH = natural.h * coverScale;

  useEffect(() => { coverRef.current = { w: coverW, h: coverH }; }, [coverW, coverH]);

  // Clamp helper — pan in screen pixels, layer = cover×zoom
  const clamp = useCallback((x, y, z, cov, stage) => {
    const layerW = cov.w * z;
    const layerH = cov.h * z;
    const maxX = Math.max(0, (layerW - stage.w) / 2);
    const maxY = Math.max(0, (layerH - stage.h) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Re-clamp pan whenever zoom or cover/stage dimensions change
  useEffect(() => {
    if (!coverW || !coverH || !stageSize.w || !stageSize.h) return;
    setPan((p) => {
      const c = clamp(p.x, p.y, zoom, { w: coverW, h: coverH }, stageSize);
      panRef.current = c;
      return c;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, stageSize.w, stageSize.h, coverW, coverH]);

  // Non-passive wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const nz = Math.min(4, Math.max(1, zoomRef.current + delta));
    setZoom(nz);
    zoomRef.current = nz;
    const c = clamp(panRef.current.x, panRef.current.y, nz, coverRef.current, stageSizeRef.current);
    setPan(c);
    panRef.current = c;
  }, [clamp]);

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
    const cov = coverRef.current;
    const stage = stageSizeRef.current;
    const z = zoomRef.current;
    const maxX = Math.max(0, (cov.w * z - stage.w) / 2);
    const maxY = Math.max(0, (cov.h * z - stage.h) / 2);
    if (maxX === 0 && maxY === 0) return;
    const dx = e.clientX - ptr.current.startX;
    const dy = e.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      ptr.current.movedEnough = true;
      setIsPanning(true);
    }
    if (ptr.current.movedEnough) {
      const c = {
        x: Math.max(-maxX, Math.min(maxX, ptr.current.startPanX + dx)),
        y: Math.max(-maxY, Math.min(maxY, ptr.current.startPanY + dy)),
      };
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
      const c = clamp(panRef.current.x, panRef.current.y, nz, coverRef.current, stageSizeRef.current);
      setPan(c);
      panRef.current = c;
      return;
    }
    if (!ptr.current.down || ptr.current.onHotspot) return;
    const cov = coverRef.current;
    const stage = stageSizeRef.current;
    const z = zoomRef.current;
    const maxX = Math.max(0, (cov.w * z - stage.w) / 2);
    const maxY = Math.max(0, (cov.h * z - stage.h) / 2);
    if (maxX === 0 && maxY === 0) return;
    const t = e.touches[0];
    const dx = t.clientX - ptr.current.startX;
    const dy = t.clientY - ptr.current.startY;
    if (!ptr.current.movedEnough && Math.hypot(dx, dy) > DRAG_THRESHOLD) { ptr.current.movedEnough = true; setIsPanning(true); }
    if (ptr.current.movedEnough) {
      const c = {
        x: Math.max(-maxX, Math.min(maxX, ptr.current.startPanX + dx)),
        y: Math.max(-maxY, Math.min(maxY, ptr.current.startPanY + dy)),
      };
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
    const nz = Math.min(4, Math.max(1, parseFloat((zoomRef.current + delta).toFixed(2))));
    setZoom(nz);
    zoomRef.current = nz;
    const c = clamp(panRef.current.x, panRef.current.y, nz, coverRef.current, stageSizeRef.current);
    setPan(c);
    panRef.current = c;
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

  // Compute layer geometry at render time — the source of truth for positioning
  const layerW = coverW * zoom;
  const layerH = coverH * zoom;
  const maxX   = coverW > 0 ? Math.max(0, (layerW - stageSize.w) / 2) : 0;
  const maxY   = coverH > 0 ? Math.max(0, (layerH - stageSize.h) / 2) : 0;
  const px     = Math.max(-maxX, Math.min(maxX, pan.x));
  const py     = Math.max(-maxY, Math.min(maxY, pan.y));
  const layerL = (stageSize.w - layerW) / 2 + px;
  const layerT = (stageSize.h - layerH) / 2 + py;
  const canPan = maxX > 0 || maxY > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#111827' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.5; } 75%, 100% { transform: scale(2); opacity: 0; } }
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
          cursor: canPan ? (isPanning ? 'grabbing' : 'grab') : 'default',
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
            {/* Hidden probe to get naturalWidth/Height */}
            <img
              src={store.imageUrl}
              alt=""
              onLoad={(e) => setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ display: 'none' }}
            />

            {/* Image layer — sized cover×zoom, positioned by left/top in screen pixels */}
            {layerW > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: layerL,
                  top: layerT,
                  width: layerW,
                  height: layerH,
                  backgroundImage: `url(${store.imageUrl})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  transition: isPanning ? 'none' : 'left 0.06s ease-out, top 0.06s ease-out',
                  willChange: 'left, top',
                }}
              >
                {/* Hotspots — positioned in layerW×layerH space */}
                {hotspots.map((h) => (
                  <HotspotAnchor
                    key={h.id}
                    hotspot={h}
                    left={h.x * layerW}
                    top={h.y * layerH}
                    width={h.w * layerW}
                    height={h.h * layerH}
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
