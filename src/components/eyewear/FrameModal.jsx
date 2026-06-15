import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BRANDS = ['Ray-Ban', 'Prada', 'Oakley', 'Dior', 'Gucci', 'Versace', 'Persol', 'Tom Ford', 'Coach', 'Other'];
const CATEGORIES = ['Sunglasses', 'Optical', 'Sports', 'Fashion'];

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#fff' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };

export function FrameModal({ frame, onSave, onClose }) {
  const [form, setForm] = useState({ brand: '', model: '', category: '', color: '', price: '', stock: '0', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (frame) {
      setForm({
        brand: frame.brand || '',
        model: frame.model || '',
        category: frame.category || '',
        color: frame.color || '',
        price: String(frame.price ?? ''),
        stock: String(frame.stock ?? 0),
        description: frame.description || '',
      });
    }
  }, [frame]);

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        color: form.color || undefined,
        description: form.description || undefined,
      });
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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{frame ? 'Edit Frame' : 'Add New Frame'}</h2>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Brand *</label>
            <select name="brand" value={form.brand} onChange={set} required style={inputStyle}>
              <option value="">Select brand</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Model *</label>
            <input style={inputStyle} name="model" value={form.model} onChange={set} required placeholder="e.g. Aviator Classic" />
          </div>

          <div>
            <label style={labelStyle}>Category *</label>
            <select name="category" value={form.category} onChange={set} required style={inputStyle}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Color</label>
            <input style={inputStyle} name="color" value={form.color} onChange={set} placeholder="e.g. Black / Gold" />
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
              {saving ? 'Saving...' : frame ? 'Update Frame' : 'Add Frame'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
