import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  urls: string[];
  initialIdx: number;
  onClose: () => void;
}

export default function ImageLightbox({ urls, initialIdx, onClose }: Props) {
  const [idx, setIdx] = useState(initialIdx);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(urls.length - 1, i + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', zIndex: 10,
        }}
      >
        <X size={18} />
      </button>

      {/* Prev */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', zIndex: 10,
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image */}
      <img
        key={urls[idx]}
        src={urls[idx]}
        alt={`Photo ${idx + 1}`}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '92vw', maxHeight: '88vh',
          objectFit: 'contain', display: 'block', borderRadius: 6,
          boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
        }}
      />

      {/* Next */}
      {idx < urls.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', zIndex: 10,
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Counter */}
      {urls.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 20, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
        }}>
          {urls.map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
