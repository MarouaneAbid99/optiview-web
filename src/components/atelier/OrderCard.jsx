import { ChevronRight, ChevronLeft, Trash2, User, Tag } from 'lucide-react';

const STATUS_LABELS = { 'in-progress': 'In Progress', ready: 'Ready', delivered: 'Deliver', pending: 'Pending' };

export function OrderCard({ order, nextStatus, prevStatus, onStatusChange, onDelete }) {
  const clientName = order.client
    ? `${order.client.firstName} ${order.client.lastName}`
    : 'Walk-in';

  const lensUnits = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 14, border: '1px solid #f3f4f6' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
          {order.orderNumber}
        </span>
        <button onClick={() => onDelete(order.id)} title="Delete order"
          style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={13} color="#d1d5db" />
        </button>
      </div>

      {/* Client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <User size={12} color="#9ca3af" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{clientName}</span>
      </div>

      {/* Frame */}
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        {order.frame.brand} {order.frame.model}
        {order.frame.color ? ` · ${order.frame.color}` : ''}
      </div>

      {/* Lenses summary */}
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
        {order.items.length} lens type{order.items.length !== 1 ? 's' : ''} · {lensUnits} unit{lensUnits !== 1 ? 's' : ''}
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        <Tag size={12} color="#7c3aed" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#7c3aed' }}>
          {order.totalPrice.toLocaleString()} MAD
        </span>
      </div>

      {/* Delivery date */}
      {order.deliveryDate && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
          Due: {new Date(order.deliveryDate).toLocaleDateString('fr-MA')}
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginBottom: 8, borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
          {order.notes}
        </div>
      )}

      {/* Status controls */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
        {prevStatus && (
          <button onClick={() => onStatusChange(order.id, prevStatus)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, color: '#6b7280', cursor: 'pointer' }}>
            <ChevronLeft size={12} /> Back
          </button>
        )}
        {nextStatus && (
          <button onClick={() => onStatusChange(order.id, nextStatus)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', background: '#1e40af', border: 'none', borderRadius: 6, fontSize: 11, color: '#fff', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
            {STATUS_LABELS[nextStatus] || nextStatus} <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
