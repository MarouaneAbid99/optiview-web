import { Trash2, Edit2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function ClientsTable({ clients, onEdit, onDelete }) {
  const isMobile = useIsMobile();

  if (clients.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>No clients found. Add your first client!</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clients.map((c) => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{c.firstName} {c.lastName}</p>
                {c.email && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{c.email}</p>}
                {c.phone && <p style={{ fontSize: 13, color: '#6b7280' }}>{c.phone}</p>}
                {c.address && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.address}</p>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onEdit(c)}
                  style={{ padding: 8, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Edit2 size={15} color="#1e40af" />
                </button>
                <button onClick={() => onDelete(c.id)}
                  style={{ padding: 8, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={15} color="#dc2626" />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ padding: '3px 10px', background: '#d1fae5', color: '#065f46', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {c.prescriptions?.length ?? 0} Rx
              </span>
              <span style={{ padding: '3px 10px', background: '#dbeafe', color: '#1e40af', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {c.appointments?.length ?? 0} Appts
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Name', 'Email', 'Phone', 'Prescriptions', 'Appointments', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '12px 20px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? '1px solid #f3f4f6' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '14px 20px' }}>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{c.firstName} {c.lastName}</div>
                {c.address && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.address}</div>}
              </td>
              <td style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280' }}>{c.email || '—'}</td>
              <td style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280' }}>{c.phone || '—'}</td>
              <td style={{ padding: '14px 20px' }}>
                <span style={{ padding: '2px 10px', background: '#d1fae5', color: '#065f46', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  {c.prescriptions?.length ?? 0}
                </span>
              </td>
              <td style={{ padding: '14px 20px' }}>
                <span style={{ padding: '2px 10px', background: '#dbeafe', color: '#1e40af', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  {c.appointments?.length ?? 0}
                </span>
              </td>
              <td style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={() => onEdit(c)} title="Edit"
                    style={{ padding: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Edit2 size={14} color="#1e40af" />
                  </button>
                  <button onClick={() => onDelete(c.id)} title="Delete"
                    style={{ padding: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} color="#dc2626" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
