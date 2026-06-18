import { useState, useEffect, useCallback } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { FramesTable } from '../components/eyewear/FramesTable';
import { FrameModal } from '../components/eyewear/FrameModal';
import { eyewearAPI } from '../api/client';
import { Plus, Package, TrendingUp, AlertTriangle, XCircle, Tag, Download } from 'lucide-react';
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

export function EyewearPage() {
  const [frames, setFrames] = useState([]);
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ brand: '', category: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [framesRes, statsRes, lowRes, brandsRes, catsRes] = await Promise.all([
        eyewearAPI.getFrames(filters.brand, filters.category),
        eyewearAPI.getStats(),
        eyewearAPI.getLowStockFrames(5),
        eyewearAPI.getBrands(),
        eyewearAPI.getCategories(),
      ]);
      setFrames(framesRes.data);
      setStats(statsRes.data);
      setLowStock(lowRes.data);
      setBrands(brandsRes.data);
      setCategories(catsRes.data);
    } catch {
      setError('Failed to load eyewear data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (data) => {
    if (selectedFrame) {
      await eyewearAPI.updateFrame(selectedFrame.id, data);
    } else {
      await eyewearAPI.createFrame(data);
    }
    setShowModal(false);
    setSelectedFrame(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this frame?')) return;
    await eyewearAPI.deleteFrame(id);
    await loadData();
  };

  const handleOpenModal = (frame = null) => { setSelectedFrame(frame); setShowModal(true); };

  const selectStyle = { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer' };

  return (
    <ModuleLayout title="Eyewear — Frames Inventory">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard label="Models" value={stats?.totalFrames} color="#1e40af" icon={<Package size={20} color="#1e40af" />} />
        <StatCard label="Total Stock" value={stats?.totalStock} color="#059669" icon={<TrendingUp size={20} color="#059669" />} />
        <StatCard label="Stock Value" value={stats ? `${stats.totalValue.toLocaleString()} MAD` : null} color="#7c3aed" icon={<Tag size={20} color="#7c3aed" />} />
        <StatCard label="Low Stock" value={stats?.lowStockFrames} color="#d97706" icon={<AlertTriangle size={20} color="#d97706" />} sub="< 5 units" />
        <StatCard label="Out of Stock" value={stats?.outOfStockFrames} color="#dc2626" icon={<XCircle size={20} color="#dc2626" />} />
      </div>

      {/* Low stock alert */}
      {lowStock.filter(f => f.stock < 5).length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 600, color: '#92400e', fontSize: 13, marginBottom: 2 }}>
              {lowStock.filter(f => f.stock < 5).length} frame(s) need restocking
            </p>
            <p style={{ fontSize: 12, color: '#b45309' }}>
              {lowStock.filter(f => f.stock < 5).map(f => `${f.brand} ${f.model} (${f.stock})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Brand:</label>
          <select value={filters.brand} onChange={e => setFilters(p => ({ ...p, brand: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Category:</label>
          <select value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))} style={selectStyle}>
            <option value="">All</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(filters.brand || filters.category) && (
          <button onClick={() => setFilters({ brand: '', category: '' })}
            style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
            Clear
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            const rows = frames.map((f) => ({
              'Marque': f.brand,
              'Modèle': f.model,
              'Catégorie': f.category,
              'Couleur': f.color || '',
              'Prix (MAD)': f.price,
              'Stock': f.stock,
            }));
            downloadCSV(`montures-${new Date().toISOString().split('T')[0]}.csv`, rows);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Download size={15} /> Export CSV
        </button>
        <button onClick={() => handleOpenModal()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Add Frame
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, color: '#dc2626', textAlign: 'center' }}>{error}</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading frames...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <FramesTable frames={frames} onEdit={handleOpenModal} onDelete={handleDelete} onReload={loadData} />
      )}

      {showModal && (
        <FrameModal frame={selectedFrame} onSave={handleSave} onClose={() => { setShowModal(false); setSelectedFrame(null); }} />
      )}
    </ModuleLayout>
  );
}
