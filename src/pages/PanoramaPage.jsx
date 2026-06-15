import { useState, useEffect } from 'react';
import { PanoramaViewer } from '../components/PanoramaViewer';
import { panoramaAPI } from '../api/client';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1574619988379-b1e65e7d4204?w=4096&h=2048&fit=crop';

export function PanoramaPage() {
  const [store, setStore] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStore = async () => {
      try {
        const response = await panoramaAPI.getStores();
        if (response.data.length > 0) {
          // Load the first store with its hotspots
          const storeRes = await panoramaAPI.getStore(response.data[0].id);
          setStore(storeRes.data);
        } else {
          // Create a default store
          const newStore = await panoramaAPI.createStore({
            name: 'Default Optical Shop',
            imageUrl: FALLBACK_IMAGE,
          });
          setStore({ ...newStore.data, hotspots: [] });
        }
      } catch (err) {
        console.error('Failed to load store:', err);
        setError('Cannot connect to backend. Make sure the server is running on port 3000.');
      }
    };

    loadStore();
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

  if (!store) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '4px solid #e5e7eb', borderTopColor: '#1e40af',
              animation: 'spin 0.9s linear infinite', margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading panorama...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return <PanoramaViewer store={store} />;
}
