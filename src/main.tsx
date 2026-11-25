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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MyWorld RootErrorBoundary]', error, info.componentStack);
  }

  handleRecover = async () => {
    try {
      // Conservar solo worldId y roomCode si el estado local quedó corrupto, limpiando el resto para que se re-descargue de Supabase
      const raw = localStorage.getItem('myworld-cozy-storage-v3');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.state) {
            parsed.state.activeBuilding = null;
            parsed.state.settingsOpen = false;
            parsed.state.hasCompletedLanding = true;
            localStorage.setItem('myworld-cozy-storage-v3', JSON.stringify(parsed));
          }
        } catch {
          localStorage.removeItem('myworld-cozy-storage-v3');
        }
      }
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

  handleHardReset = async () => {
    try {
      localStorage.removeItem('myworld-cozy-storage-v3');
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
            minHeight: '100dvh',
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
          <p style={{ fontSize: '14px', opacity: 0.78, maxWidth: '360px', marginBottom: '12px' }}>
            Se ha detectado una actualización o un dato antiguo en caché. Pulsa abajo para recargar al instante.
          </p>
          {this.state.errorMsg && (
            <p
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                background: '#FFEAF0',
                color: '#8B2645',
                padding: '8px 12px',
                borderRadius: '12px',
                maxWidth: '360px',
                marginBottom: '18px',
                wordBreak: 'break-word',
              }}
            >
              Detalle técnico: {this.state.errorMsg}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
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
            <button
              onClick={this.handleHardReset}
              style={{
                background: 'transparent',
                color: '#6B5A50',
                border: '1px solid #E5D4C8',
                borderRadius: '999px',
                padding: '9px 18px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Limpiar caché local y volver a vincular código
            </button>
          </div>
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

