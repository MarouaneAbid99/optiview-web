import { useState, useEffect } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { usersAPI } from '../api/client';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827',
  background: '#fff', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
};

export function SettingsPage() {
  const [form, setForm] = useState({ name: '', address: '', phone: '', ice: '', city: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await usersAPI.getMyShop();
      const s = res.data;
      setForm({
        name:    s.name    || '',
        address: s.address || '',
        phone:   s.phone   || '',
        ice:     s.ice     || '',
        city:    s.city    || '',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await usersAPI.updateMyShop(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, placeholder = '') => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={form[name]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        style={inputStyle}
      />
    </div>
  );

  if (loading) {
    return (
      <ModuleLayout title="Shop Settings">
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Shop Settings">
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 24, maxWidth: 520 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {field('Shop Name', 'name')}
          {field('Address', 'address')}
          {field('City', 'city')}
          {field('Phone', 'phone', 'e.g. 0600000000')}
          {field('ICE', 'ice', "Identifiant Commun de l'Entreprise")}

          {saved && (
            <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>Saved ✓</p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{ padding: '10px 20px', background: saving ? '#93c5fd' : '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
          This information will appear on invoices (coming soon).
        </p>
      </div>
    </ModuleLayout>
  );
}
