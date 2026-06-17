import { useState, useEffect } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { usersAPI } from '../api/client';
import { Plus, Power, X, Store } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827',
  boxSizing: 'border-box',
};

export function AdminPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', shopName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.listShops();
      setShops(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await usersAPI.createOptician(form);
      setForm({ name: '', email: '', password: '', shopName: '' });
      setShowModal(false);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create optician');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleShop = async (shop) => {
    try {
      await usersAPI.setShopActive(shop.id, !shop.active);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ModuleLayout title="Admin — Shops & Opticians">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setError(''); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={15} /> Add Optician + Shop
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : shops.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
          No shops yet. Add the first optician above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {shops.map((shop) => {
            const owner = shop.users?.[0];
            return (
              <div key={shop.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#111827', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Store size={15} color="#1e40af" />
                      {shop.name}
                    </p>
                    {owner && (
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {owner.name} · {owner.email}
                      </p>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: shop.active ? '#16a34a' : '#dc2626', marginTop: 4, display: 'inline-block' }}>
                      {shop.active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleShop(shop)}
                    title={shop.active ? 'Suspend shop' : 'Activate shop'}
                    style={{ padding: 8, background: shop.active ? '#fef2f2' : '#f0fdf4', border: `1px solid ${shop.active ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 8 }}
                  >
                    <Power size={16} color={shop.active ? '#dc2626' : '#16a34a'} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Users', value: shop._count?.users ?? 0 },
                    { label: 'Clients', value: shop._count?.clients ?? 0 },
                    { label: 'Products', value: (shop._count?.frames ?? 0) + (shop._count?.lenses ?? 0) },
                    { label: 'Orders', value: shop._count?.orders ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{value}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Add Optician + Shop</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {error && (
              <div style={{ margin: '16px 24px 0', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Optician name"
                value={form.name}
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Shop name"
                value={form.shopName}
                required
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={form.password}
                required
                minLength={6}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px 0', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: submitting ? '#93c5fd' : '#1e40af', color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
