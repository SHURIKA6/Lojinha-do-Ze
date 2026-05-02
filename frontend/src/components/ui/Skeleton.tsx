import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente de Skeleton para estados de carregamento.
 * Utiliza as animações definidas no globals.css.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = '',
  style,
}) => {
  const customStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || '1rem',
    borderRadius: borderRadius || 'var(--radius-sm)',
    ...style,
  };

  return <div className={`skeleton ${className}`} style={customStyle} />;
};
