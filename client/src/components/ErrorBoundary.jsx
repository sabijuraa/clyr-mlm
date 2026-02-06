import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#2D3436' }}>
            Etwas ist schiefgelaufen
          </h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{ background: '#5DADE2', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Zur Startseite
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{ marginTop: '20px', textAlign: 'left', background: '#f5f5f5', padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
