import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HotspotLayer } from './HotspotLayer';
import { panoramaAPI } from '../api/client';

export function PanoramaViewer({ storeId, store: initialStore }) {
  const panoramaRef = useRef(null);
  const viewerRef = useRef(null);
  const [store, setStore] = useState(initialStore || null);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(!initialStore);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialStore) {
      setStore(initialStore);
      setHotspots(initialStore.hotspots || []);
      return;
    }

    const fetchStore = async () => {
      try {
        const response = await panoramaAPI.getStore(storeId);
        setStore(response.data);
        setHotspots(response.data.hotspots || []);
      } catch (error) {
        console.error('Failed to load store:', error);
      } finally {
        setLoading(false);
      }
    };

    if (storeId) fetchStore();
  }, [storeId, initialStore]);

  useEffect(() => {
    if (!store || !panoramaRef.current) return;

    // Dynamically import pannellum to avoid SSR issues
    import('pannellum').then((pannellum) => {
      const lib = pannellum.default || pannellum;
      if (typeof lib.viewer !== 'function') return;

      // Destroy previous viewer if any
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
      }

      viewerRef.current = lib.viewer(panoramaRef.current, {
        type: 'equirectangular',
        panorama: store.imageUrl,
        autoLoad: true,
        showControls: true,
        mouseZoom: true,
        autoRotate: false,
        showFullscreenCtrl: false,
      });
    });

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [store]);

  const handleHotspotClick = (module) => {
    navigate(`/module/${module}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div
            className="mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-blue-700"
            style={{ width: 48, height: 48, animation: 'spin 1s linear infinite' }}
          />
          <p className="text-gray-500 text-sm">Loading panorama...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e40af', letterSpacing: '-0.3px' }}>OPTIVIEW</h1>
            {store && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>{store.name}</p>}
          </div>
          <button
            onClick={() => navigate('/editor')}
            style={{ padding: '7px 14px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Edit </span>Hotspots
          </button>
        </div>
      </div>

      {/* Panorama area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {store ? (
          <>
            <div ref={panoramaRef} style={{ width: '100%', height: '100%' }} />
            <HotspotLayer
              hotspots={hotspots}
              onHotspotClick={handleHotspotClick}
              containerRef={panoramaRef}
            />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <p>No store found. Create one via the API.</p>
          </div>
        )}
      </div>
    </div>
  );
}
