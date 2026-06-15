import { Trash2, MapPin, MousePointer } from 'lucide-react';

const MODULES = [
  { value: 'clients', label: 'Clients',  dot: '#22c55e' },
  { value: 'eyewear', label: 'Eyewear',  dot: '#3b82f6' },
  { value: 'lenses',  label: 'Lenses',   dot: '#a855f7' },
  { value: 'atelier', label: 'Atelier',  dot: '#f97316' },
];

const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#fff' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' };

export function HotspotEditPanel({ hotspots, selectedHotspot, onSelectHotspot, onUpdate, onDelete }) {
  const selected = hotspots.find((h) => h.id === selectedHotspot);

  return (
    <div style={{ padding: 16 }}>
      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <MapPin size={15} color="#1e40af" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Hotspots</span>
        <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#1e40af', borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>
          {hotspots.length}
        </span>
      </div>

      {/* Hotspot list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {hotspots.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#9ca3af' }}>
            <MousePointer size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontSize: 13 }}>Draw a rectangle on the image to create a hotspot</p>
          </div>
        )}

        {hotspots.map((h, i) => {
          const isSelected = selectedHotspot === h.id;
          const mod = MODULES.find((m) => m.value === h.module);
          const incomplete = !h.module || !h.label;
          return (
            <button
              key={h.id}
              onClick={() => onSelectHotspot(h.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                borderRadius: 8, border: isSelected ? '2px solid #1e40af' : '1px solid #e5e7eb',
                background: isSelected ? '#eff6ff' : '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: mod?.dot || '#9ca3af', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.label || `Hotspot ${i + 1}`}
                </p>
                {incomplete && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 1 }}>Incomplete</p>}
              </div>
              {mod && <span style={{ fontSize: 11, color: '#6b7280' }}>{mod.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Edit panel for selected */}
      {selected && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Edit Hotspot</p>

          {/* Module */}
          <div>
            <label style={labelStyle}>Module</label>
            <select
              value={selected.module}
              onChange={(e) => {
                const module = e.target.value;
                const autoLabel = MODULES.find((m) => m.value === module)?.label || '';
                onUpdate(selected.id, {
                  module,
                  // Auto-fill label only if it's still empty or matches another module name
                  ...(!selected.label || MODULES.some((m) => m.label === selected.label)
                    ? { label: autoLabel }
                    : {}),
                });
              }}
              style={inputStyle}
            >
              <option value="">Select module…</option>
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label style={labelStyle}>Label</label>
            <input
              type="text"
              value={selected.label}
              onChange={(e) => onUpdate(selected.id, { label: e.target.value })}
              placeholder="e.g. Reception, Frame Wall…"
              style={inputStyle}
            />
          </div>

          {/* Coords readout */}
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Coordinates (normalized)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>
              <span>x: {selected.x.toFixed(4)}</span>
              <span>y: {selected.y.toFixed(4)}</span>
              <span>w: {selected.w.toFixed(4)}</span>
              <span>h: {selected.h.toFixed(4)}</span>
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(selected.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: 'none', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Trash2 size={14} /> Delete Hotspot
          </button>
        </div>
      )}

      {!selected && hotspots.length > 0 && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
            Click a hotspot to edit it, or draw a new rectangle on the image.
          </p>
        </div>
      )}
    </div>
  );
}
