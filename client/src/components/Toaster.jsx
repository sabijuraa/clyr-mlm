import { useState, useEffect } from 'react';
import toast from '../utils/toast';

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = toast.subscribe((event) => {
      if (event.action === 'add') {
        setToasts(prev => [...prev, event.toast]);
      } else if (event.action === 'remove') {
        setToasts(prev => prev.filter(t => t.id !== event.id));
      }
    });
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => toast.dismiss(t.id)}
          style={{
            pointerEvents: 'auto',
            background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#2D3436' : '#2D3436',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            maxWidth: 360,
            animation: 'slideInRight 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {t.type === 'success' && <span style={{ fontSize: 16 }}>✓</span>}
          {t.type === 'error' && <span style={{ fontSize: 16 }}>✕</span>}
          {t.type === 'loading' && <span style={{ fontSize: 14, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
