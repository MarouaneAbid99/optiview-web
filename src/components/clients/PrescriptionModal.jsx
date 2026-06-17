import { useState } from 'react';
import { X } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827',
  background: '#fff', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
};

export function PrescriptionModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    dateIssued: new Date().toISOString().split('T')[0],
    sphereOD: '', sphereOS: '', cylinderOD: '', cylinderOS: '',
    axisOD: '', axisOS: '', additionOD: '', additionOS: '', notes: '',
  });

  const num = (v) => (v === '' ? undefined : parseFloat(v));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      dateIssued: form.dateIssued,
      sphereOD: num(form.sphereOD), sphereOS: num(form.sphereOS),
      cylinderOD: num(form.cylinderOD), cylinderOS: num(form.cylinderOS),
      axisOD: num(form.axisOD), axisOS: num(form.axisOS),
      additionOD: num(form.additionOD), additionOS: num(form.additionOS),
      ...(form.notes && { notes: form.notes }),
    });
  };

  const numField = (name, placeholder) => (
    <input
      type="number" step="0.25" placeholder={placeholder} value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      style={inputStyle}
    />
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Add Prescription</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.dateIssued}
              onChange={(e) => setForm({ ...form, dateIssued: e.target.value })}
              style={inputStyle} />
          </div>

          {/* OD / OS grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {numField('sphereOD',   'OD Sphere')}
            {numField('sphereOS',   'OS Sphere')}
            {numField('cylinderOD', 'OD Cylinder')}
            {numField('cylinderOS', 'OS Cylinder')}
            {numField('axisOD',     'OD Axis')}
            {numField('axisOS',     'OS Axis')}
            {numField('additionOD', 'OD Addition')}
            {numField('additionOS', 'OS Addition')}
          </div>

          {/* Notes */}
          <textarea
            placeholder="Notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px 0', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit"
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#1e40af', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
