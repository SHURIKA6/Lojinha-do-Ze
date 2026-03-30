'use client';

export default function AccessibilityStyles() {
  return (
    <style jsx>{`
      .skip-link:focus {
        top: 6px !important;
      }
      
      /* Melhora o foco para acessibilidade */
      :focus-visible {
        outline: 3px solid #667eea;
        outline-offset: 2px;
      }
      
      /* Suporte a alto contraste */
      @media (prefers-contrast: high) {
        :root {
          --primary-500: #0000ff;
          --danger-500: #ff0000;
          --success-500: #00ff00;
        }
      }
      
      /* Reduz animações para usuários que preferem */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}