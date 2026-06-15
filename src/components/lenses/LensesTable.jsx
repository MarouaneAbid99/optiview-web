import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { lensesAPI } from '../../api/client';
import { useIsMobile } from '../../hooks/useIsMobile';

const TYPE_COLORS = {
  'Single Vision': { bg: '#eff6ff', color: '#1d4ed8' },
  'Progressive':   { bg: '#f5f3ff', color: '#6d28d9' },
  'Bifocal':       { bg: '#eef2ff', color: '#4338ca' },
  'Reading':       { bg: '#f0fdfa', color: '#0f766e' },
};

function stockBadge(stock) {
  if (stock === 0)  return { bg: '#fef2f2', color: '#dc2626' };
  if (stock < 10)   return { bg: '#fefce8', color: '#ca8a04' };
  return              { bg: '#f0fdf4', color: '#16a34a' };
}

export function LensesTable({ lenses, onEdit, onDelete, onReload }) {
  const [editing, setEditing] = useState({});
  const isMobile = useIsMobile();

  const commitStock = async (id, val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 0) return;
    try {
      await lensesAPI.updateStock(id, parsed);
      await onReload();
    } catch {}
    setEditing((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  if (lenses.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>No lenses found. Add your first lens!</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lenses.map((l) => {
          const typeColor = TYPE_COLORS[l.type] || { bg: '#f3f4f6', color: '#374151' };
          const badge = stockBadge(l.stock);
          const stockVal = editing[l.id] !== undefined ? editing[l.id] : String(l.stock);
          const specs = [l.coating, l.treatment].filter(Boolean).join(' · ');
          return (
            <div key={l.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ padding: '3px 10px', background: typeColor.bg, color: typeColor.color, borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    {l.type}
                  </span>
                  <p style={{ fontSize: 14, color: '#374151', marginTop: 6, fontWeight: 500 }}>{l.material}</p>
                  {specs && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{specs}</p>}
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 4 }}>{l.price.toFixed(2)} MAD</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onEdit(l)}
                    style={{ padding: 8, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Edit2 size={15} color="#1e40af" />
                  </button>
                  <button onClick={() => onDelete(l.id)}
                    style={{ padding: 8, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={15} color="#dc2626" />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Stock:</span>
                <input
                  type="number" min="0"
                  value={stockVal}
                  onChange={e => setEditing(p => ({ ...p, [l.id]: e.target.value }))}
                  onBlur={e => commitStock(l.id, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitStock(l.id, stockVal)}
                  style={{ width: 72, padding: '5px 8px', textAlign: 'center', fontWeight: 700, border: `1px solid ${badge.color}40`, borderRadius: 8, background: badge.bg, color: badge.color, fontSize: 14, outline: 'none' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Type', 'Material', 'Coating', 'Treatment', 'Price', 'Stock', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '12px 20px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lenses.map((l, i) => {
            const typeColor = TYPE_COLORS[l.type] || { bg: '#f3f4f6', color: '#374151' };
            const badge = stockBadge(l.stock);
            const stockVal = editing[l.id] !== undefined ? editing[l.id] : String(l.stock);
            return (
              <tr key={l.id} style={{ borderBottom: i < lenses.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ padding: '3px 10px', background: typeColor.bg, color: typeColor.color, borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{l.type}</span>
                </td>
                <td style={{ padding: '14px 20px', color: '#374151', fontSize: 14 }}>{l.material}</td>
                <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: 13 }}>{l.coating || '—'}</td>
                <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: 13 }}>{l.treatment || '—'}</td>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827', fontSize: 14 }}>{l.price.toFixed(2)} MAD</td>
                <td style={{ padding: '14px 20px' }}>
                  <input
                    type="number" min="0"
                    value={stockVal}
                    onChange={e => setEditing(p => ({ ...p, [l.id]: e.target.value }))}
                    onBlur={e => commitStock(l.id, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && commitStock(l.id, stockVal)}
                    style={{ width: 64, padding: '4px 8px', textAlign: 'center', fontWeight: 700, border: `1px solid ${badge.color}40`, borderRadius: 8, background: badge.bg, color: badge.color, fontSize: 13, outline: 'none' }}
                  />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button onClick={() => onEdit(l)} title="Edit"
                      style={{ padding: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={14} color="#1e40af" />
                    </button>
                    <button onClick={() => onDelete(l.id)} title="Delete"
                      style={{ padding: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
