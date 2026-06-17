import { useState, useEffect, useRef } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { OrderModal } from '../components/atelier/OrderModal';
import { atelierAPI } from '../api/client';
import { Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_LABELS = {
  sale:         'Sale',
  montage:      'Montage',
  sale_montage: 'Sale + Montage',
};
const TYPE_BADGE = {
  sale:         { bg: '#dbeafe', color: '#1d4ed8' },
  montage:      { bg: '#fdf4ff', color: '#7e22ce' },
  sale_montage: { bg: '#ede9fe', color: '#6d28d9' },
};
const STATUS_BADGE = {
  pending:      { bg: '#f3f4f6', color: '#374151' },
  'in-progress':{ bg: '#dbeafe', color: '#1d4ed8' },
  ready:        { bg: '#dcfce7', color: '#15803d' },
  delivered:    { bg: '#f3e8ff', color: '#7e22ce' },
  cancelled:    { bg: '#fee2e2', color: '#dc2626' },
};

const inputStyle = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', color: '#111827', background: '#fff',
};

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, typeFilter, statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search)      params.search    = search;
      if (typeFilter)  params.orderType = typeFilter;
      if (statusFilter) params.status   = statusFilter;
      const res = await atelierAPI.getOrders(params);
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      await atelierAPI.createOrder(data);
      setShowModal(false);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create order';
      alert(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <ModuleLayout title="Orders & Sales">
      {/* Controls bar */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Search + New Order */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search order # or client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingLeft: 34, boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Plus size={15} /> New Order
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
            <option value="">All Types</option>
            <option value="sale">Sale</option>
            <option value="montage">Montage</option>
            <option value="sale_montage">Sale + Montage</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {(search || typeFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}
              style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', border: '1px solid #e5e7eb' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
          No orders found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {orders.map((o) => {
            const isOpen = expanded === o.id;
            const clientName = o.client ? `${o.client.firstName} ${o.client.lastName}` : 'Walk-in';
            const typeBadge = TYPE_BADGE[o.orderType] || { bg: '#f3f4f6', color: '#374151' };
            const statusBadge = STATUS_BADGE[o.status] || { bg: '#f3f4f6', color: '#374151' };

            return (
              <div key={o.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {/* Summary row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      {o.orderNumber}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: typeBadge.bg, color: typeBadge.color, whiteSpace: 'nowrap' }}>
                      {TYPE_LABELS[o.orderType] || o.orderType}
                    </span>
                    <span style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clientName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap' }}>
                      {o.totalPrice.toLocaleString()} MAD
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: statusBadge.bg, color: statusBadge.color, whiteSpace: 'nowrap' }}>
                      {o.status}
                    </span>
                    {isOpen ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Date */}
                    <Row label="Date" value={new Date(o.createdAt).toLocaleDateString('fr-MA')} />

                    {/* Frame */}
                    {o.frame
                      ? <Row label="Frame" value={`${o.frame.brand} ${o.frame.model}${o.frame.color ? ' · ' + o.frame.color : ''} — ${o.frame.price.toLocaleString()} MAD`} />
                      : <Row label="Frame" value="Client's own" italic />
                    }

                    {/* Lenses */}
                    {o.items?.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>Lenses</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                          {o.items.map((it) => (
                            <span key={it.id} style={{ fontSize: 13, color: '#111827' }}>
                              {it.lens?.type} {it.lens?.material} ×{it.quantity} — {(it.pricePerUnit * it.quantity).toLocaleString()} MAD
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Labor */}
                    {o.laborPrice != null && (
                      <Row label="Montage labor" value={`${o.laborPrice.toLocaleString()} MAD`} />
                    )}

                    {/* Delivery */}
                    {o.deliveryDate && (
                      <Row label="Delivery due" value={new Date(o.deliveryDate).toLocaleDateString('fr-MA')} />
                    )}

                    {/* Notes */}
                    {o.notes && <Row label="Notes" value={o.notes} italic />}

                    {/* Total */}
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span style={{ fontSize: 14, color: '#111827' }}>Total</span>
                      <span style={{ fontSize: 15, color: '#1e40af' }}>{o.totalPrice.toLocaleString()} MAD</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <OrderModal onSave={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </ModuleLayout>
  );
}

function Row({ label, value, italic }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111827', textAlign: 'right', fontStyle: italic ? 'italic' : 'normal' }}>{value}</span>
    </div>
  );
}
