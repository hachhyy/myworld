import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registro y actualización inmediata del Service Worker para evitar bundles antiguos en caché tras despliegues en Vercel
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Error inesperado' };
  }

  handleRecover = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFDF9',
            color: '#4A3B32',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🪐✨</div>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '22px', marginBottom: '8px' }}>
            Actualizando nuestro planeta...
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.75, maxWidth: '360px', marginBottom: '20px' }}>
            Se ha publicado una nueva versión de vuestro mundo. Pulsa abajo para sincronizar al instante.
          </p>
          <button
            onClick={this.handleRecover}
            style={{
              background: '#FF8FA3',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(255,143,163,0.35)',
            }}
          >
            🔄 Restaurar y recargar nuestro planeta
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

