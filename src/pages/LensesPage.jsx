import { useState, useEffect, useCallback } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { LensesTable } from '../components/lenses/LensesTable';
import { LensModal } from '../components/lenses/LensModal';
import { lensesAPI } from '../api/client';
import { Plus, Eye, Layers, Tag, AlertTriangle, XCircle, Download } from 'lucide-react';
import { downloadCSV } from '../utils/csv';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value ?? '—'}</p>
        {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

const selectStyle = { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer' };

export function LensesPage() {
  const [lenses, setLenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [types, setTypes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', material: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedLens, setSelectedLens] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [lensesRes, statsRes, lowRes, typesRes, matsRes] = await Promise.all([
        lensesAPI.getLenses(filters.type, filters.material),
        lensesAPI.getStats(),
        lensesAPI.getLowStockLenses(10),
        lensesAPI.getTypes(),
        lensesAPI.getMaterials(),
      ]);
      setLenses(lensesRes.data);
      setStats(statsRes.data);
      setLowStock(lowRes.data);
      setTypes(typesRes.data);
      setMaterials(matsRes.data);
    } catch {
      setError('Failed to load lenses data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (data) => {
    if (selectedLens) {
      await lensesAPI.updateLens(selectedLens.id, data);
    } else {
      await lensesAPI.createLens(data);
    }
    setShowModal(false);
    setSelectedLens(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lens?')) return;
    await lensesAPI.deleteLens(id);
    await loadData();
  };

  const handleOpenModal = (lens = null) => { setSelectedLens(lens); setShowModal(true); };

  const alertLenses = lowStock.filter(l => l.stock < 10);

  return (
    <ModuleLayout title="Lenses — Optical Inventory">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard label="Models" value={stats?.totalLenses} color="#1e40af" icon={<Eye size={20} color="#1e40af" />} />
        <StatCard label="Total Stock" value={stats?.totalStock} color="#059669" icon={<Layers size={20} color="#059669" />} />
        <StatCard label="Stock Value" value={stats ? `${stats.totalValue.toLocaleString()} MAD` : null} color="#7c3aed" icon={<Tag size={20} color="#7c3aed" />} />
        <StatCard label="Low Stock" value={stats?.lowStockLenses} color="#d97706" icon={<AlertTriangle size={20} color="#d97706" />} sub="< 10 units" />
        <StatCard label="Out of Stock" value={stats?.outOfStockLenses} color="#dc2626" icon={<XCircle size={20} color="#dc2626" />} />
      </div>

      {/* Low stock alert */}
      {alertLenses.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 600, color: '#92400e', fontSize: 13, marginBottom: 2 }}>
              {alertLenses.length} lens type(s) need restocking
            </p>
            <p style={{ fontSize: 12, color: '#b45309' }}>
              {alertLenses.map(l => `${l.type} / ${l.material} (${l.stock})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Type:</label>
          <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Material:</label>
          <select value={filters.material} onChange={e => setFilters(p => ({ ...p, material: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            {materials.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {(filters.type || filters.material) && (
          <button onClick={() => setFilters({ type: '', material: '' })}
            style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
            Clear
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            const rows = lenses.map((l) => ({
              'Type': l.type,
              'Matériau': l.material,
              'Traitement': l.coating || '',
              'Traitement spécial': l.treatment || '',
              'Prix (MAD)': l.price,
              'Stock': l.stock,
            }));
            downloadCSV(`verres-${new Date().toISOString().split('T')[0]}.csv`, rows);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Download size={15} /> Export CSV
        </button>
        <button onClick={() => handleOpenModal()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Add Lens
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, color: '#dc2626', textAlign: 'center' }}>{error}</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading lenses...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <LensesTable lenses={lenses} onEdit={handleOpenModal} onDelete={handleDelete} onReload={loadData} />
      )}

      {showModal && (
        <LensModal lens={selectedLens} onSave={handleSave} onClose={() => { setShowModal(false); setSelectedLens(null); }} />
      )}
    </ModuleLayout>
  );
}
