import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function ModuleLayout({ title, children }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', flexShrink: 0 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', color: '#1e40af', fontSize: 13, fontWeight: 500, gap: 4 }}
            title="Back to Panorama"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e40af' }}>{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
