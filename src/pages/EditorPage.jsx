import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Image as ImageIcon, Upload } from 'lucide-react';
import { panoramaAPI } from '../api/client';
import { uploadImageToCloudinary } from '../api/cloudinary';
import { HotspotDrawCanvas } from '../components/editor/HotspotDrawCanvas';
import { HotspotEditPanel } from '../components/editor/HotspotEditPanel';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1574619988379-b1e65e7d4204?w=4096&h=2048&fit=crop';

export function EditorPage() {
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const loadStore = useCallback(async () => {
    try {
      setLoading(true);
      const res = await panoramaAPI.getStores();
      let storeData;
      if (res.data.length > 0) {
        const full = await panoramaAPI.getStore(res.data[0].id);
        storeData = full.data;
      } else {
        const created = await panoramaAPI.createStore({
          name: 'My Optical Shop',
          imageUrl: FALLBACK_IMAGE,
        });
        storeData = { ...created.data, hotspots: [] };
      }
      setStore(storeData);
      setHotspots(storeData.hotspots || []);
      setImageUrlInput(storeData.imageUrl);
    } catch (e) {
      const msg = e?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to load store'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStore(); }, [loadStore]);

  const handleDrawComplete = (rect) => {
    const newH = {
      id: `temp-${Date.now()}`,
      storeId: store.id,
      module: '',
      label: '',
      ...rect,
      isNew: true,
    };
    setHotspots((prev) => [...prev, newH]);
    setSelectedHotspot(newH.id);
  };

  const handleUpdate = (id, updates) => {
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  const handleDelete = async (id) => {
    const h = hotspots.find((x) => x.id === id);
    if (!h.isNew) {
      try { await panoramaAPI.deleteHotspot(id); }
      catch (e) { console.error('Delete failed:', e); return; }
    }
    setHotspots((prev) => prev.filter((x) => x.id !== id));
    if (selectedHotspot === id) setSelectedHotspot(null);
  };

  const handleSaveImageUrl = async () => {
    if (!imageUrlInput.trim() || imageUrlInput === store.imageUrl) return;
    try {
      await panoramaAPI.updateStore(store.id, { imageUrl: imageUrlInput.trim() });
      setStore((prev) => ({ ...prev, imageUrl: imageUrlInput.trim() }));
      flash('Image URL updated');
    } catch (e) {
      const msg = e?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update image URL'));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    try {
      setUploading(true);
      const url = await uploadImageToCloudinary(file);
      await panoramaAPI.updateStore(store.id, { imageUrl: url });
      setStore((prev) => ({ ...prev, imageUrl: url }));
      setImageUrlInput(url);
      flash('Image uploaded and saved');
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveAll = async () => {
    const invalid = hotspots.filter((h) => !h.module || !h.label);
    if (invalid.length > 0) {
      alert(`${invalid.length} hotspot(s) missing module or label. Please complete them first.`);
      return;
    }
    try {
      setSaving(true);
      for (const h of hotspots) {
        const payload = { storeId: store.id, module: h.module, label: h.label, x: h.x, y: h.y, w: h.w, h: h.h };
        if (h.isNew) {
          await panoramaAPI.createHotspot(payload);
        } else {
          await panoramaAPI.updateHotspot(h.id, payload);
        }
      }
      await loadStore();
      setSelectedHotspot(null);
      flash('All hotspots saved!');
    } catch (e) {
      const msg = e?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to save hotspots'));
    } finally {
      setSaving(false);
    }
  };

  const flash = (msg) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1e40af', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <p style={{ color: '#6b7280' }}>No store found. Create one via the API first.</p>
        <button onClick={() => navigate('/')} style={{ padding: '8px 20px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Back</button>
      </div>
    );
  }

  const unsavedCount = hotspots.filter((h) => h.isNew).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <div style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/')}
            style={{ padding: 7, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={18} color="#1e40af" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#1e40af', lineHeight: 1 }}>Hotspot Editor</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Click + drag on the image to draw hotspot areas</p>
          </div>

          {saveMsg && (
            <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              {saveMsg}
            </span>
          )}
          {unsavedCount > 0 && !saveMsg && (
            <span style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
              {unsavedCount} unsaved
            </span>
          )}

          <button
            onClick={handleSaveAll}
            disabled={saving || hotspots.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              background: saving || hotspots.length === 0 ? '#93c5fd' : '#1e40af',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: saving || hotspots.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>

        {/* Image URL bar */}
        <div style={{ padding: '8px 20px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <ImageIcon size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveImageUrl()}
            placeholder="Panorama image URL"
            style={{ flex: 1, minWidth: 140, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', color: '#374151' }}
          />
          <button
            onClick={handleSaveImageUrl}
            style={{ padding: '6px 14px', background: '#e5e7eb', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Update URL
          </button>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
            background: uploading ? '#93c5fd' : '#1e40af', color: '#fff',
            borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
          }}>
            <Upload size={13} />
            {uploading ? 'Uploading…' : 'Upload Image'}
            <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: window.innerWidth >= 900 ? 'row' : 'column', overflow: 'hidden' }}>
        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <HotspotDrawCanvas
            imageUrl={store.imageUrl}
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            onDrawComplete={handleDrawComplete}
            onSelectHotspot={setSelectedHotspot}
            onUpdateHotspot={handleUpdate}
          />
        </div>

        {/* Side panel */}
        <div style={{
          width: window.innerWidth >= 900 ? 280 : '100%',
          maxHeight: window.innerWidth >= 900 ? 'none' : '45vh',
          background: '#fff',
          borderLeft: window.innerWidth >= 900 ? '1px solid #e5e7eb' : 'none',
          borderTop: window.innerWidth < 900 ? '1px solid #e5e7eb' : 'none',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <HotspotEditPanel
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={setSelectedHotspot}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
