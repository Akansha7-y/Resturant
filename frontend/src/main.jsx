import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0c1017',
          color: '#f0f0f0',
          fontFamily: 'Outfit, sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            padding: '36px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ color: '#d4af37', marginBottom: '12px' }}>✦ L'Étoile Reserve</h2>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>Something unexpected occurred while rendering the page.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#d4af37',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#d4af37',
                  border: '1px solid #d4af37',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Reset Session & Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

