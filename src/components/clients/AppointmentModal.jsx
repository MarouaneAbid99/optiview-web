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

export function AppointmentModal({ onSave, onClose }) {
  const [form, setForm] = useState({ dateTime: '', status: 'pending', notes: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      dateTime: new Date(form.dateTime).toISOString(),
      status: form.status,
      ...(form.notes && { notes: form.notes }),
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', maxWidth: 480, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Add Appointment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date & Time */}
          <div>
            <label style={labelStyle}>Date &amp; Time</label>
            <input type="datetime-local" required value={form.dateTime}
              onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
              style={inputStyle} />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Notes */}
          <textarea placeholder="Notes" rows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }} />

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
