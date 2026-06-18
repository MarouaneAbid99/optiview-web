import { useState, useEffect, useCallback } from 'react';
import { ModuleLayout } from '../components/ModuleLayout';
import { ClientsTable } from '../components/clients/ClientsTable';
import { ClientModal } from '../components/clients/ClientModal';
import { clientsAPI } from '../api/client';
import { Plus, Users, FileText, Calendar, Download } from 'lucide-react';
import { downloadCSV } from '../utils/csv';

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [clientsRes, statsRes] = await Promise.all([
        clientsAPI.getClients(search),
        clientsAPI.getStats(),
      ]);
      setClients(clientsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to load clients. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadData]);

  const handleSave = async (data) => {
    if (selectedClient) {
      await clientsAPI.updateClient(selectedClient.id, data);
    } else {
      await clientsAPI.createClient(data);
    }
    setShowModal(false);
    setSelectedClient(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client? This cannot be undone.')) return;
    await clientsAPI.deleteClient(id);
    await loadData();
  };

  const handleOpenModal = (client = null) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  return (
    <ModuleLayout title="Clients Management">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Clients" value={stats?.totalClients} color="#1e40af"
          icon={<Users size={22} color="#1e40af" />} />
        <StatCard label="With Prescriptions" value={stats?.clientsWithPrescriptions} color="#059669"
          icon={<FileText size={22} color="#059669" />} />
        <StatCard label="With Appointments" value={stats?.clientsWithAppointments} color="#7c3aed"
          icon={<Calendar size={22} color="#7c3aed" />} />
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827' }}
        />
        <button
          onClick={() => {
            const rows = clients.map((c) => ({
              'Prénom': c.firstName,
              'Nom': c.lastName,
              'Email': c.email || '',
              'Téléphone': c.phone || '',
              'Adresse': c.address || '',
              'Prescriptions': c.prescriptions?.length || 0,
              'Rendez-vous': c.appointments?.length || 0,
            }));
            downloadCSV(`clients-${new Date().toISOString().split('T')[0]}.csv`, rows);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Download size={15} /> Export CSV
        </button>
        <button onClick={() => handleOpenModal()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, color: '#dc2626', textAlign: 'center' }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading clients...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <ClientsTable
          clients={clients}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <ClientModal
          client={selectedClient}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setSelectedClient(null); }}
        />
      )}
    </ModuleLayout>
  );
}
