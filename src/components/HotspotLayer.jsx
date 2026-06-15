import { useState, useEffect, useRef } from 'react';

export function HotspotLayer({ hotspots, onHotspotClick, containerRef }) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeHotspot, setActiveHotspot] = useState(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);

  if (containerSize.width === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: containerSize.width, height: containerSize.height }}
    >
      {hotspots.map((hotspot) => {
        const left = hotspot.x * containerSize.width;
        const top = hotspot.y * containerSize.height;
        const width = hotspot.w * containerSize.width;
        const height = hotspot.h * containerSize.height;

        return (
          <div
            key={hotspot.id}
            className={`hotspot pointer-events-auto ${activeHotspot === hotspot.id ? 'active' : ''}`}
            style={{ left, top, width, height }}
            onClick={() => {
              setActiveHotspot(hotspot.id);
              onHotspotClick(hotspot.module);
            }}
            onMouseEnter={() => setActiveHotspot(hotspot.id)}
            onMouseLeave={() => setActiveHotspot(null)}
          >
            <span className="hotspot-label">{hotspot.label}</span>
          </div>
        );
      })}
    </div>
  );
}
