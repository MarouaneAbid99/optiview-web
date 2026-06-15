import { useState, useEffect, useCallback } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { KanbanBoard } from '../components/atelier/KanbanBoard';
import { OrderModal } from '../components/atelier/OrderModal';
import { atelierAPI } from '../api/client';
import { Plus, ShoppingBag, Clock, Wrench, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export function AtelierPage() {
  const [kanban, setKanban] = useState({ pending: [], 'in-progress': [], ready: [], delivered: [], cancelled: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [kanbanRes, statsRes] = await Promise.all([
        atelierAPI.getKanban(),
        atelierAPI.getStats(),
      ]);
      setKanban(kanbanRes.data);
      setStats(statsRes.data);
    } catch {
      setError('Failed to load atelier data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateOrder = async (data) => {
    await atelierAPI.createOrder(data);
    setShowModal(false);
    await loadData();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await atelierAPI.updateStatus(orderId, newStatus);
    await loadData();
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order? Stock will be restored.')) return;
    await atelierAPI.deleteOrder(orderId);
    await loadData();
  };

  return (
    <ModuleLayout title="Atelier — Workshop Orders">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard label="Total Orders" value={stats?.totalOrders} color="#1e40af" icon={<ShoppingBag size={18} color="#1e40af" />} />
        <StatCard label="Pending" value={stats?.pending} color="#6b7280" icon={<Clock size={18} color="#6b7280" />} />
        <StatCard label="In Progress" value={stats?.inProgress} color="#2563eb" icon={<Wrench size={18} color="#2563eb" />} />
        <StatCard label="Ready" value={stats?.ready} color="#059669" icon={<CheckCircle size={18} color="#059669" />} />
        <StatCard label="Revenue" value={stats ? `${stats.totalRevenue.toLocaleString()} MAD` : null} color="#7c3aed" icon={<TrendingUp size={18} color="#7c3aed" />} />
        <StatCard label="Pending Rev." value={stats ? `${stats.pendingRevenue.toLocaleString()} MAD` : null} color="#d97706" icon={<DollarSign size={18} color="#d97706" />} />
      </div>

      {/* New Order button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, color: '#dc2626', textAlign: 'center' }}>{error}</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading orders...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <KanbanBoard kanban={kanban} onStatusChange={handleStatusChange} onDelete={handleDeleteOrder} />
      )}

      {showModal && (
        <OrderModal onSave={handleCreateOrder} onClose={() => setShowModal(false)} />
      )}
    </ModuleLayout>
  );
}
