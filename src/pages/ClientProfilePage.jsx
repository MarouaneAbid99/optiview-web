import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModuleLayout } from '../components/ModuleLayout';
import { clientsAPI } from '../api/client';
import { PrescriptionModal } from '../components/clients/PrescriptionModal';
import { AppointmentModal } from '../components/clients/AppointmentModal';
import { Plus, Mail, Phone, MapPin, Calendar, Glasses, Eye, FileText, Wrench, Trash2, ChevronLeft } from 'lucide-react';

const card = {
  background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 20,
};

const STATUS_BADGE = {
  pending:      { bg: '#f3f4f6', color: '#374151' },
  'in-progress':{ bg: '#dbeafe', color: '#1d4ed8' },
  ready:        { bg: '#dcfce7', color: '#15803d' },
  delivered:    { bg: '#f3e8ff', color: '#7e22ce' },
  cancelled:    { bg: '#fee2e2', color: '#dc2626' },
  confirmed:    { bg: '#dcfce7', color: '#15803d' },
  completed:    { bg: '#f3e8ff', color: '#7e22ce' },
};

const TYPE_LABELS = {
  sale: 'Sale', montage: 'Montage', sale_montage: 'Sale + Montage',
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function Section({ title, icon: Icon, onAdd, children }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} color="#1e40af" /> {title}
        </h3>
        {onAdd && (
          <button onClick={onAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1e40af', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRx, setShowRx] = useState(false);
  const [showAppt, setShowAppt] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await clientsAPI.getClientById(id);
      setClient(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addRx = async (data) => {
    await clientsAPI.addPrescription(id, data);
    setShowRx(false);
    await load();
  };

  const deleteRx = async (rxId) => {
    if (!confirm('Delete this prescription?')) return;
    await clientsAPI.deletePrescription(rxId);
    await load();
  };

  const addAppt = async (data) => {
    await clientsAPI.addAppointment(id, data);
    setShowAppt(false);
    await load();
  };

  if (loading) {
    return (
      <ModuleLayout title="Client Profile">
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </ModuleLayout>
    );
  }

  if (!client) {
    return (
      <ModuleLayout title="Client Profile">
        <div style={{ ...card, textAlign: 'center', color: '#6b7280' }}>Client not found.</div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title={`${client.firstName} ${client.lastName}`}>
      {/* Contact card */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
              {client.firstName} {client.lastName}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {client.email && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
                  <Mail size={13} /> {client.email}
                </p>
              )}
              {client.phone && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
                  <Phone size={13} /> {client.phone}
                </p>
              )}
              {client.address && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
                  <MapPin size={13} /> {client.address}
                </p>
              )}
              {client.birthDate && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
                  <Calendar size={13} /> {new Date(client.birthDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/module/clients')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1e40af', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            <ChevronLeft size={14} /> Back to list
          </button>
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Prescriptions */}
        <Section title="Prescriptions" icon={FileText} onAdd={() => setShowRx(true)}>
          {!client.prescriptions?.length ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No prescriptions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {client.prescriptions.map((rx) => (
                <div key={rx.id} style={{ border: '1px solid #f3f4f6', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(rx.dateIssued).toLocaleDateString()}
                    </span>
                    <button onClick={() => deleteRx(rx.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12, color: '#374151' }}>
                    <span>OD Sph: {rx.sphereOD ?? '—'}</span>
                    <span>OS Sph: {rx.sphereOS ?? '—'}</span>
                    <span>OD Cyl: {rx.cylinderOD ?? '—'}</span>
                    <span>OS Cyl: {rx.cylinderOS ?? '—'}</span>
                    <span>OD Axis: {rx.axisOD ?? '—'}</span>
                    <span>OS Axis: {rx.axisOS ?? '—'}</span>
                    {(rx.additionOD != null || rx.additionOS != null) && (
                      <>
                        <span>OD Add: {rx.additionOD ?? '—'}</span>
                        <span>OS Add: {rx.additionOS ?? '—'}</span>
                      </>
                    )}
                  </div>
                  {rx.notes && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>{rx.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Appointments */}
        <Section title="Appointments" icon={Calendar} onAdd={() => setShowAppt(true)}>
          {!client.appointments?.length ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No appointments.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {client.appointments.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 12px' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    {new Date(a.dateTime).toLocaleString('fr-MA')}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Orders (Atelier) */}
        <Section title="Orders" icon={Wrench}>
          {!client.orders?.length ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No orders.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {client.orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => navigate('/module/orders')}
                  style={{ width: '100%', textAlign: 'left', border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 12px', background: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '1px 6px', borderRadius: 4 }}>
                      {o.orderNumber}
                    </span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {o.frame ? `${o.frame.brand} ${o.frame.model}` : "Client's own frame"}
                      {o.items?.length ? ` · ${o.items.length} lens item${o.items.length > 1 ? 's' : ''}` : ''}
                      {o.orderType && ` · ${TYPE_LABELS[o.orderType] || o.orderType}`}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                      {o.totalPrice.toLocaleString()} MAD
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Purchases (legacy) */}
        <Section title="Purchases" icon={Glasses}>
          {!client.purchases?.length ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No purchases.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {client.purchases.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 12px' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    {p.frame?.brand} {p.frame?.model} ×{p.quantity}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                    {p.totalPrice.toLocaleString()} MAD
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {showRx && <PrescriptionModal onSave={addRx} onClose={() => setShowRx(false)} />}
      {showAppt && <AppointmentModal onSave={addAppt} onClose={() => setShowAppt(false)} />}
    </ModuleLayout>
  );
}
