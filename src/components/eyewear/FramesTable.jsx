import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { eyewearAPI } from '../../api/client';
import { useIsMobile } from '../../hooks/useIsMobile';

function stockBadge(stock) {
  if (stock === 0) return { bg: '#fef2f2', color: '#dc2626' };
  if (stock < 5)   return { bg: '#fefce8', color: '#ca8a04' };
  return              { bg: '#f0fdf4', color: '#16a34a' };
}

export function FramesTable({ frames, onEdit, onDelete, onReload }) {
  const [editing, setEditing] = useState({});
  const isMobile = useIsMobile();

  const commitStock = async (id, val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 0) return;
    try {
      await eyewearAPI.updateStock(id, parsed);
      await onReload();
    } catch {}
    setEditing((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  if (frames.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🕶️</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>No frames found. Add your first frame!</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {frames.map((f) => {
          const badge = stockBadge(f.stock);
          const stockVal = editing[f.id] !== undefined ? editing[f.id] : String(f.stock);
          return (
            <div key={f.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{f.brand} {f.model}</p>
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {f.category}{f.color ? ` · ${f.color}` : ''}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 4 }}>{f.price.toFixed(2)} MAD</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onEdit(f)}
                    style={{ padding: 8, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Edit2 size={15} color="#1e40af" />
                  </button>
                  <button onClick={() => onDelete(f.id)}
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
                  onChange={e => setEditing(p => ({ ...p, [f.id]: e.target.value }))}
                  onBlur={e => commitStock(f.id, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitStock(f.id, stockVal)}
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
            {['Brand', 'Model', 'Category', 'Color', 'Price', 'Stock', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '12px 20px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {frames.map((f, i) => {
            const badge = stockBadge(f.stock);
            const stockVal = editing[f.id] !== undefined ? editing[f.id] : String(f.stock);
            return (
              <tr key={f.id} style={{ borderBottom: i < frames.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 20px', fontWeight: 700, color: '#111827', fontSize: 14 }}>{f.brand}</td>
                <td style={{ padding: '14px 20px', color: '#374151', fontSize: 14 }}>{f.model}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ padding: '2px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{f.category}</span>
                </td>
                <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: 13 }}>{f.color || '—'}</td>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827', fontSize: 14 }}>{f.price.toFixed(2)} MAD</td>
                <td style={{ padding: '14px 20px' }}>
                  <input
                    type="number" min="0"
                    value={stockVal}
                    onChange={e => setEditing(p => ({ ...p, [f.id]: e.target.value }))}
                    onBlur={e => commitStock(f.id, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && commitStock(f.id, stockVal)}
                    style={{ width: 64, padding: '4px 8px', textAlign: 'center', fontWeight: 700, border: `1px solid ${badge.color}40`, borderRadius: 8, background: badge.bg, color: badge.color, fontSize: 13, outline: 'none' }}
                  />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button onClick={() => onEdit(f)} title="Edit"
                      style={{ padding: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={14} color="#1e40af" />
                    </button>
                    <button onClick={() => onDelete(f.id)} title="Delete"
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
