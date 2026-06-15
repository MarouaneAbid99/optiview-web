import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TYPES = ['Single Vision', 'Progressive', 'Bifocal', 'Reading'];
const MATERIALS = ['CR-39', 'Polycarbonate', 'High Index 1.67', 'High Index 1.74', 'Trivex'];
const COATINGS = ['Anti-Reflective', 'UV Protection', 'Scratch Resistant', 'Anti-Fog'];
const TREATMENTS = ['Photochromic', 'Blue Light', 'Polarized', 'Tinted'];

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#fff' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };

export function LensModal({ lens, onSave, onClose }) {
  const [form, setForm] = useState({ type: '', material: '', coating: '', treatment: '', price: '', stock: '0', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lens) {
      setForm({
        type: lens.type || '',
        material: lens.material || '',
        coating: lens.coating || '',
        treatment: lens.treatment || '',
        price: String(lens.price ?? ''),
        stock: String(lens.stock ?? 0),
        description: lens.description || '',
      });
    }
  }, [lens]);

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
      };
      if (!payload.coating) delete payload.coating;
      if (!payload.treatment) delete payload.treatment;
      if (!payload.description) delete payload.description;
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message?.[0] || err?.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, boxShadow: '0 -4px 30px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{lens ? 'Edit Lens' : 'Add New Lens'}</h2>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Type *</label>
            <select name="type" value={form.type} onChange={set} required style={inputStyle}>
              <option value="">Select type</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Material *</label>
            <select name="material" value={form.material} onChange={set} required style={inputStyle}>
              <option value="">Select material</option>
              {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Coating</label>
              <select name="coating" value={form.coating} onChange={set} style={inputStyle}>
                <option value="">None</option>
                {COATINGS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Treatment</label>
              <select name="treatment" value={form.treatment} onChange={set} style={inputStyle}>
                <option value="">None</option>
                {TREATMENTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Price (MAD) *</label>
              <input style={inputStyle} type="number" name="price" value={form.price} onChange={set} required min="0" step="0.01" placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Stock</label>
              <input style={inputStyle} type="number" name="stock" value={form.stock} onChange={set} min="0" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={form.description} onChange={set} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional notes..." />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: saving ? '#93c5fd' : '#1e40af', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : lens ? 'Update Lens' : 'Add Lens'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
