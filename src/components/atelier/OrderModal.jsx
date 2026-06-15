import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { clientsAPI, eyewearAPI, lensesAPI } from '../../api/client';

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#111827', background: '#fff' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };

export function OrderModal({ onSave, onClose }) {
  const [clients, setClients] = useState([]);
  const [frames, setFrames] = useState([]);
  const [lenses, setLenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clientId: '',
    frameId: '',
    items: [{ lensId: '', quantity: 1 }],
    notes: '',
    deliveryDate: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [cRes, fRes, lRes] = await Promise.all([
          clientsAPI.getClients(),
          eyewearAPI.getFrames(),
          lensesAPI.getLenses(),
        ]);
        setClients(cRes.data);
        setFrames(fRes.data.filter(f => f.stock > 0));
        setLenses(lRes.data.filter(l => l.stock > 0));
      } catch {
        setError('Failed to load options');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const setItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: field === 'quantity' ? (parseInt(value) || 1) : value };
    setForm(p => ({ ...p, items }));
  };

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { lensId: '', quantity: 1 }] }));
  const removeItem = (index) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));

  const calcTotal = () => {
    const framePrice = frames.find(f => f.id === form.frameId)?.price ?? 0;
    const lensTotal = form.items.reduce((sum, item) => {
      const lens = lenses.find(l => l.id === item.lensId);
      return sum + (lens ? lens.price * item.quantity : 0);
    }, 0);
    return framePrice + lensTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.frameId) { setError('Please select a frame'); return; }
    if (form.items.some(i => !i.lensId)) { setError('Please select all lenses'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...(form.clientId && { clientId: form.clientId }),
        frameId: form.frameId,
        items: form.items,
        ...(form.notes && { notes: form.notes }),
        ...(form.deliveryDate && { deliveryDate: form.deliveryDate }),
      };
      await onSave(payload);
    } catch (err) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg || err?.message || 'Failed to create order'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.8s linear infinite', margin: 'auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const total = calcTotal();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, boxShadow: '0 -4px 30px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto', margin: '0 auto' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>New Order</h2>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Client */}
          <div>
            <label style={labelStyle}>Client (optional)</label>
            <select name="clientId" value={form.clientId} onChange={set} style={inputStyle}>
              <option value="">Walk-in Customer</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>

          {/* Frame */}
          <div>
            <label style={labelStyle}>Frame *</label>
            <select name="frameId" value={form.frameId} onChange={set} required style={inputStyle}>
              <option value="">Select frame</option>
              {frames.map(f => (
                <option key={f.id} value={f.id}>
                  {f.brand} {f.model}{f.color ? ` · ${f.color}` : ''} — {f.price.toLocaleString()} MAD (stock: {f.stock})
                </option>
              ))}
            </select>
            {frames.length === 0 && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>No frames in stock</p>
            )}
          </div>

          {/* Lens items */}
          <div>
            <label style={labelStyle}>Lenses *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={item.lensId}
                    onChange={e => setItem(i, 'lensId', e.target.value)}
                    required
                    style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                  >
                    <option value="">Select lens</option>
                    {lenses.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.type} / {l.material}{l.coating ? ` · ${l.coating}` : ''} — {l.price} MAD (stock: {l.stock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => setItem(i, 'quantity', e.target.value)}
                    min="1"
                    style={{ width: 60, padding: '9px 8px', border: '1px solid #d1d5db', borderRadius: 8, textAlign: 'center', fontSize: 14, outline: 'none' }}
                  />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      style={{ padding: 6, background: 'none', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'none', border: '1px dashed #d1d5db', borderRadius: 6, fontSize: 12, color: '#1e40af', cursor: 'pointer' }}>
              <Plus size={13} /> Add another lens
            </button>
          </div>

          {/* Delivery date + Notes grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Delivery Date</label>
              <input type="date" name="deliveryDate" value={form.deliveryDate} onChange={set} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input name="notes" value={form.notes} onChange={set} placeholder="Special instructions..." style={inputStyle} />
            </div>
          </div>

          {/* Total */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0369a1' }}>Estimated Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1e40af' }}>
              {total.toLocaleString()} MAD
            </span>
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
              {saving ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
