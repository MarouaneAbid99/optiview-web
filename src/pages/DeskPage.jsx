import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '../components/ModuleLayout';
import { OrderModal } from '../components/atelier/OrderModal';
import { clientsAPI, eyewearAPI, lensesAPI, atelierAPI } from '../api/client';
import { Users, Glasses, Eye, Wrench, AlertCircle, TrendingUp, Package, Plus } from 'lucide-react';

const card = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  padding: 20,
};

const STATUS_COLORS = {
  pending:     { bg: '#f3f4f6', color: '#374151' },
  'in-progress': { bg: '#dbeafe', color: '#1d4ed8' },
  ready:       { bg: '#dcfce7', color: '#15803d' },
  delivered:   { bg: '#f3e8ff', color: '#7e22ce' },
};

export function DeskPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [data, setData] = useState({
    clients: null, eyewear: null, lenses: null, orders: null,
    lowFrames: [], lowLenses: [], kanban: null,
  });

  useEffect(() => { loadAll(); }, []);

  const handleCreateOrder = async (data) => {
    try {
      await atelierAPI.createOrder(data);
      setShowOrderModal(false);
      await loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create order';
      alert(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [clientsStats, eyewearStats, lensesStats, orderStats, lowFrames, lowLenses, kanban] =
        await Promise.all([
          clientsAPI.getStats(),
          eyewearAPI.getStats(),
          lensesAPI.getStats(),
          atelierAPI.getStats(),
          eyewearAPI.getLowStockFrames(5),
          lensesAPI.getLowStockLenses(10),
          atelierAPI.getKanban(),
        ]);
      setData({
        clients: clientsStats.data,
        eyewear: eyewearStats.data,
        lenses: lensesStats.data,
        orders: orderStats.data,
        lowFrames: lowFrames.data,
        lowLenses: lowLenses.data,
        kanban: kanban.data,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ModuleLayout title="Desk — Dashboard">
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </ModuleLayout>
    );
  }

  const { clients, eyewear, lenses, orders, lowFrames, lowLenses, kanban } = data;
  const inventoryValue = (eyewear?.totalValue || 0) + (lenses?.totalValue || 0);
  const activeOrders = (orders?.pending || 0) + (orders?.inProgress || 0) + (orders?.ready || 0);
  const recentOrders = kanban
    ? [...(kanban.pending || []), ...(kanban['in-progress'] || []), ...(kanban.ready || [])]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
    : [];

  const metrics = [
    {
      icon: Users, label: 'Clients', color: '#22c55e',
      value: clients?.totalClients ?? 0,
      sub: `${clients?.clientsWithPrescriptions ?? 0} with prescriptions`,
      path: '/module/clients',
    },
    {
      icon: Package, label: 'Inventory Value', color: '#3b82f6',
      value: `${inventoryValue.toLocaleString()} MAD`,
      sub: `${eyewear?.totalStock ?? 0} frames · ${lenses?.totalStock ?? 0} lenses`,
      path: '/module/eyewear',
    },
    {
      icon: Wrench, label: 'Active Orders', color: '#f97316',
      value: activeOrders,
      sub: `${orders?.delivered ?? 0} delivered`,
      path: '/module/atelier',
    },
    {
      icon: TrendingUp, label: 'Revenue (delivered)', color: '#a855f7',
      value: `${(orders?.totalRevenue ?? 0).toLocaleString()} MAD`,
      sub: `${(orders?.pendingRevenue ?? 0).toLocaleString()} MAD pending`,
      path: '/module/atelier',
    },
  ];

  const statusRows = [
    { label: 'Pending',     value: orders?.pending ?? 0,    ...STATUS_COLORS.pending },
    { label: 'In Progress', value: orders?.inProgress ?? 0, ...STATUS_COLORS['in-progress'] },
    { label: 'Ready',       value: orders?.ready ?? 0,      ...STATUS_COLORS.ready },
    { label: 'Delivered',   value: orders?.delivered ?? 0,  ...STATUS_COLORS.delivered },
  ];

  const quickLinks = [
    { label: 'Clients',  path: '/module/clients',  bg: '#22c55e' },
    { label: 'Eyewear',  path: '/module/eyewear',  bg: '#3b82f6' },
    { label: 'Lenses',   path: '/module/lenses',   bg: '#a855f7' },
    { label: 'Atelier',  path: '/module/atelier',  bg: '#f97316' },
  ];

  return (
    <ModuleLayout title="Desk — Dashboard">
      {/* New Order button */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowOrderModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={15} /> New Order
        </button>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {metrics.map(({ icon: Icon, label, color, value, sub, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{ ...card, textAlign: 'left', border: 'none', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = card.boxShadow; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
              <Icon size={18} color={color} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value}</p>
            {sub && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</p>}
          </button>
        ))}
      </div>

      {/* Orders by status */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Orders by Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {statusRows.map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: s.color, marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Low stock alerts */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#d97706" /> Low Stock Alerts
          </h3>
          {lowFrames.length === 0 && lowLenses.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>Everything is well stocked ✓</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lowFrames.map((f) => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Glasses size={13} color="#3b82f6" /> {f.brand} {f.model}
                  </span>
                  <span style={{ fontWeight: 600, color: f.stock === 0 ? '#dc2626' : '#d97706' }}>{f.stock} left</span>
                </div>
              ))}
              {lowLenses.map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={13} color="#a855f7" /> {l.type} {l.material}
                  </span>
                  <span style={{ fontWeight: 600, color: l.stock === 0 ? '#dc2626' : '#d97706' }}>{l.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent active orders */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={16} color="#f97316" /> Recent Active Orders
          </h3>
          {recentOrders.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280' }}>No active orders</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => navigate('/module/atelier')}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e40af', fontWeight: 600 }}>{o.orderNumber}</span>
                  <span style={{ color: '#374151', flex: 1, textAlign: 'center', padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.client ? `${o.client.firstName} ${o.client.lastName}` : 'Walk-in'}
                  </span>
                  <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{o.totalPrice.toLocaleString()} MAD</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        {quickLinks.map(({ label, path, bg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{ background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {label}
          </button>
        ))}
      </div>

      {showOrderModal && (
        <OrderModal onSave={handleCreateOrder} onClose={() => setShowOrderModal(false)} />
      )}
    </ModuleLayout>
  );
}
