import { FiAlertCircle, FiSettings } from 'react-icons/fi';

interface PlaceholderProps {
  title: string;
  subtitle: string;
}

export default function AdminPlaceholder({ title, subtitle }: PlaceholderProps) {
  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiSettings />
            Gerenciamento
          </span>
          <h1>{title}</h1>
          <p className="page-header__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="empty-state" style={{ minHeight: '40vh', border: '2px dashed var(--gray-200)', borderRadius: '16px', background: 'var(--bg-secondary)' }}>
        <div className="empty-state__icon" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)' }}>
          <FiAlertCircle />
        </div>
        <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--gray-800)' }}>Página em Manutenção</h3>
        <p style={{ maxWidth: '400px', margin: '0 auto var(--space-6) auto' }}>
          Este módulo de <strong>{title}</strong> está sendo integrado ao novo sistema Next.js. 
          A funcionalidade completa será restaurada em breve.
        </p>
        <button 
          className="btn btn--secondary"
          onClick={() => window.history.back()}
        >
          Voltar para o Painel
        </button>
      </div>
    </div>
  );
}
