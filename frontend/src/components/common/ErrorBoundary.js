import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-card">
            <h1 className="error-boundary-title">Oops! Algo deu errado.</h1>
            <p className="error-boundary-text">
              Ocorreu um erro inesperado. Por favor, tente atualizar a página ou volte mais tarde.
            </p>
            <button 
              className="error-boundary-btn"
              onClick={() => window.location.reload()}
            >
              Recarregar Página
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="error-boundary-debug">
                {this.state.error && this.state.error.toString()}
              </pre>
            )}
          </div>
          <style jsx>{`
            .error-boundary-fallback {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 2rem;
              background: #f8fafc;
              font-family: inherit;
            }
            .error-boundary-card {
              max-width: 480px;
              width: 100%;
              text-align: center;
              padding: 2.5rem;
              background: white;
              border-radius: 1rem;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            }
            .error-boundary-title {
              font-size: 1.5rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 1rem;
            }
            .error-boundary-text {
              color: #64748b;
              margin-bottom: 2rem;
              line-height: 1.6;
            }
            .error-boundary-btn {
              background: #2563eb;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-weight: 600;
              border: none;
              cursor: pointer;
              transition: background 0.2s;
            }
            .error-boundary-btn:hover {
              background: #1d4ed8;
            }
            .error-boundary-debug {
              margin-top: 2rem;
              padding: 1rem;
              background: #f1f5f9;
              border-radius: 0.5rem;
              font-size: 0.875rem;
              color: #dc2626;
              text-align: left;
              overflow-x: auto;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
