import { OrderCard } from './OrderCard';

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     bg: '#f9fafb', headerBg: '#f3f4f6', headerColor: '#374151', dot: '#9ca3af' },
  { key: 'in-progress', label: 'In Progress', bg: '#eff6ff', headerBg: '#dbeafe', headerColor: '#1e40af', dot: '#3b82f6' },
  { key: 'ready',      label: 'Ready',        bg: '#f0fdf4', headerBg: '#dcfce7', headerColor: '#166534', dot: '#22c55e' },
  { key: 'delivered',  label: 'Delivered',    bg: '#faf5ff', headerBg: '#ede9fe', headerColor: '#6d28d9', dot: '#8b5cf6' },
];

const NEXT_STATUS = { pending: 'in-progress', 'in-progress': 'ready', ready: 'delivered' };
const PREV_STATUS = { 'in-progress': 'pending', ready: 'in-progress', delivered: 'ready' };

export function KanbanBoard({ kanban, onStatusChange, onDelete }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, minWidth: 760 }}>
      {COLUMNS.map((col) => {
        const orders = kanban[col.key] || [];
        return (
          <div key={col.key} style={{ background: col.bg, borderRadius: 12, padding: 14, minHeight: 320 }}>
            {/* Column header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, display: 'inline-block' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: col.headerColor }}>{col.label}</span>
              </div>
              <span style={{ background: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, color: col.headerColor, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                {orders.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  nextStatus={NEXT_STATUS[col.key]}
                  prevStatus={PREV_STATUS[col.key]}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))}
              {orders.length === 0 && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>No orders</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
