import { useState, useEffect } from 'react';
import { PanoramaViewer } from '../components/PanoramaViewer';
import { panoramaAPI } from '../api/client';

export function PanoramaPage() {
  const [storeId, setStoreId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await panoramaAPI.getStores();
        if (res.data.length > 0) {
          setStoreId(res.data[0].id);
        } else {
          const created = await panoramaAPI.createStore({ name: 'My Optical Shop', imageUrl: '' });
          setStoreId(created.data.id);
        }
      } catch (err) {
        console.error('Failed to load store:', err);
        setError('Cannot connect to backend. Make sure the server is running.');
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>Backend Not Available</h2>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return <PanoramaViewer storeId={storeId} />;
}
