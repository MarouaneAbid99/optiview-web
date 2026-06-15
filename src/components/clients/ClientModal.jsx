import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111827',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};

export function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setForm({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
      });
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      // Strip empty optional strings
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message?.[0] || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, boxShadow: '0 -4px 30px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} name="firstName" value={form.firstName} onChange={handleChange} required placeholder="Ahmed" />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} name="lastName" value={form.lastName} onChange={handleChange} required placeholder="Hassan" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" name="email" value={form.email} onChange={handleChange} placeholder="ahmed@example.com" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+212612345678" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} name="address" value={form.address} onChange={handleChange} placeholder="Casablanca, Morocco" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Birth Date</label>
            <input style={inputStyle} type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: saving ? '#93c5fd' : '#1e40af', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : client ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
