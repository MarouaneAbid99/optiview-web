import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { panoramaAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const MODULE_LABELS = {
  desk:    { title: 'Desk',    subtitle: 'Business Overview' },
  clients: { title: 'Clients', subtitle: 'Manage Customers' },
  eyewear: { title: 'Eyewear', subtitle: 'Manage Frames' },
  lenses:  { title: 'Lenses',  subtitle: 'Manage Lenses' },
  atelier: { title: 'Atelier', subtitle: 'Manage Production' },
  orders:  { title: 'Orders',  subtitle: 'Sales & Orders' },
};

function HotspotAnchor({ hotspot, left, top, width, height, zoom, onClick }) {
  const meta = MODULE_LABELS[hotspot.module] || { title: hotspot.label || 'Open', subtitle: '' };
  const inv = 1 / zoom;
  return (
    <button
      data-hotspot="true"
      onClick={onClick}
      style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${inv})`, transformOrigin: 'center center', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: 'rgba(59,130,246,0.4)', animation: 'opv-ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', position: 'relative' }} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.95)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', padding: '4px 10px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{meta.title}</span>
          {meta.subtitle && <span style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.2 }}>{meta.subtitle}</span>}
        </span>
      </span>
    </button>
  );
}

export function PanoramaViewer({ storeId }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const stageRef = useRef(null);
  const pointer  = useRef({ down: false, movedEnough: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0, onHotspot: false });
  const pinch    = useRef({ active: false, startDist: 0, startZoom: 1 });

  const [store, setStore]         = useState(null);
  const [hotspots, setHotspots]   = useState([]);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural]     = useState({ w: 0, h: 0 });
  const [zoom, setZoom]           = useState(1);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Load store data
  useEffect(() => {
    if (!storeId) return;
    panoramaAPI.getStore(storeId)
      .then((res) => { setStore(res.data); setHotspots(res.data.hotspots || []); })
      .catch((err) => console.error('Failed to load store', err));
  }, [storeId]);

  // Measure stage via ResizeObserver
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  // Get natural image dimensions via JS Image
  useEffect(() => {
    if (!store?.imageUrl) return;
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = store.imageUrl;
  }, [store?.imageUrl]);

  // ── Derived geometry ──────────────────────────────────────────────────────
  const haveDims = natural.w > 0 && natural.h > 0 && stageSize.w > 0 && stageSize.h > 0;
  const coverScale = haveDims ? Math.max(stageSize.w / natural.w, stageSize.h / natural.h) : 1;
  const coverW = natural.w * coverScale;
  const coverH = natural.h * coverScale;
  const layerW = coverW * zoom;
  const layerH = coverH * zoom;
  const maxX   = Math.max(0, (layerW - stageSize.w) / 2);
  const maxY   = Math.max(0, (layerH - stageSize.h) / 2);
  const px     = Math.max(-maxX, Math.min(maxX, pan.x));
  const py     = Math.max(-maxY, Math.min(maxY, pan.y));
  const layerLeft = (stageSize.w - layerW) / 2 + px;
  const layerTop  = (stageSize.h - layerH) / 2 + py;
  const canPan    = maxX > 0 || maxY > 0;

  // Re-clamp pan when zoom or size changes
  useEffect(() => {
    setPan((p) => ({
      x: Math.max(-maxX, Math.min(maxX, p.x)),
      y: Math.max(-maxY, Math.min(maxY, p.y)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, stageSize.w, stageSize.h, coverW, coverH]);

  // Non-passive wheel (registered imperatively so preventDefault works)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const onHotspot = !!e.target.closest('[data-hotspot]');
    pointer.current = { down: true, movedEnough: false, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y, onHotspot };
  };
  const handlePointerMove = (e) => {
    if (!pointer.current.down || pointer.current.onHotspot || !canPan) return;
    const dx = e.clientX - pointer.current.startX;
    const dy = e.clientY - pointer.current.startY;
    if (!pointer.current.movedEnough && Math.hypot(dx, dy) > 6) { pointer.current.movedEnough = true; setIsPanning(true); }
    if (pointer.current.movedEnough) {
      setPan({
        x: Math.max(-maxX, Math.min(maxX, pointer.current.startPanX + dx)),
        y: Math.max(-maxY, Math.min(maxY, pointer.current.startPanY + dy)),
      });
    }
  };
  const handlePointerUp = () => { pointer.current.down = false; setIsPanning(false); };

  // ── Touch handlers ────────────────────────────────────────────────────────
  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinch.current = { active: true, startDist: touchDist(e.touches), startZoom: zoom };
      pointer.current.down = false;
      return;
    }
    const t = e.touches[0];
    const onHotspot = !!e.target.closest('[data-hotspot]');
    pointer.current = { down: true, movedEnough: false, startX: t.clientX, startY: t.clientY, startPanX: pan.x, startPanY: pan.y, onHotspot };
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinch.current.active) {
      const ratio = touchDist(e.touches) / pinch.current.startDist;
      setZoom(Math.min(4, Math.max(1, pinch.current.startZoom * ratio)));
      return;
    }
    if (!pointer.current.down || pointer.current.onHotspot || !canPan) return;
    const t = e.touches[0];
    const dx = t.clientX - pointer.current.startX;
    const dy = t.clientY - pointer.current.startY;
    if (!pointer.current.movedEnough && Math.hypot(dx, dy) > 6) { pointer.current.movedEnough = true; setIsPanning(true); }
    if (pointer.current.movedEnough) {
      setPan({
        x: Math.max(-maxX, Math.min(maxX, pointer.current.startPanX + dx)),
        y: Math.max(-maxY, Math.min(maxY, pointer.current.startPanY + dy)),
      });
    }
  };
  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) pinch.current.active = false;
    pointer.current.down = false;
    setIsPanning(false);
  };

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  const bumpZoom = (delta) => setZoom((z) => Math.min(4, Math.max(1, parseFloat((z + delta).toFixed(2)))));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const shopLabel = user?.shop?.name || (user?.role === 'DEVELOPER' ? 'Developer' : '');

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#111827' }}>
      <style>{`@keyframes opv-ping { 0% { transform: scale(1); opacity: 0.7; } 75%, 100% { transform: scale(2); opacity: 0; } }`}</style>

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e40af', letterSpacing: '-0.3px', margin: 0 }}>OPTIVIEW</h1>
            {store && <p style={{ fontSize: 13, color: '#6b7280', margin: '1px 0 0' }}>{store.name}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {user && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', margin: 0 }}>{user.name}</p>
                {shopLabel && <p style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', margin: 0 }}>{shopLabel}</p>}
              </div>
            )}
            {user?.role === 'OPTICIAN' && (
              <button onClick={() => navigate('/employees')} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Employees</button>
            )}
            {user?.role === 'DEVELOPER' && (
              <button onClick={() => navigate('/admin')} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Admin</button>
            )}
            {user?.role === 'OPTICIAN' && (
              <button onClick={() => navigate('/settings')} title="Shop Settings" style={{ padding: 7, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <SettingsIcon size={17} color="#374151" />
              </button>
            )}
            <button onClick={() => navigate('/editor')} style={{ padding: '7px 14px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Edit Hotspots</button>
            <button onClick={logout} title="Logout" style={{ padding: 7, background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <LogOut size={18} color="#6b7280" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stage ── */}
      <div
        ref={stageRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#111827', cursor: canPan ? (isPanning ? 'grabbing' : 'grab') : 'default', touchAction: 'none', userSelect: 'none' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {store?.imageUrl && haveDims && (
          <div style={{
            position: 'absolute',
            left: `${layerLeft}px`,
            top: `${layerTop}px`,
            width: `${layerW}px`,
            height: `${layerH}px`,
            backgroundImage: `url(${store.imageUrl})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            transition: isPanning ? 'none' : 'left 0.06s ease-out, top 0.06s ease-out',
          }}>
            {hotspots.map((h) => (
              <HotspotAnchor
                key={h.id}
                hotspot={h}
                left={h.x * layerW}
                top={h.y * layerH}
                width={h.w * layerW}
                height={h.h * layerH}
                zoom={zoom}
                onClick={() => { if (pointer.current.movedEnough) return; navigate(`/module/${h.module}`); }}
              />
            ))}
          </div>
        )}

        {!store?.imageUrl && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#d1d5db', marginBottom: 16 }}>No shop image yet.</p>
              <button onClick={() => navigate('/editor')} style={{ padding: '9px 22px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Add an image in the editor</button>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); bumpZoom(0.25); }} style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); bumpZoom(-0.25); }} style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); resetView(); }} style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
          <div style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6, padding: '2px 4px', fontSize: 10, textAlign: 'center', fontWeight: 600 }}>{Math.round(zoom * 100)}%</div>
        </div>
      </div>
    </div>
  );
}
