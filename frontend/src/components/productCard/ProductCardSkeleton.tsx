import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './ProductCard.module.css';

/**
 * Esqueleto de carregamento para o ProductCard.
 * Mantém as mesmas dimensões e estrutura para evitar layout shift.
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <article className={`${styles.product} ${styles.isSkeleton}`}>
      <div className={styles.image}>
        <Skeleton height="100%" borderRadius="0" />
      </div>

      <div className={styles.info}>
        <Skeleton width="40%" height="0.75rem" borderRadius="var(--radius-full)" className={styles.category} />
        <Skeleton width="80%" height="1.25rem" className={styles.name} style={{ marginTop: '0.5rem' }} />
        
        <div style={{ marginTop: '0.75rem' }}>
          <Skeleton width="100%" height="0.7rem" />
          <Skeleton width="90%" height="0.7rem" style={{ marginTop: '0.4rem' }} />
        </div>

        <div className={styles.footer} style={{ marginTop: '1.25rem' }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height="1.5rem" />
            <Skeleton width="30%" height="0.7rem" style={{ marginTop: '0.4rem' }} />
          </div>
          <Skeleton width="2.8rem" height="2.8rem" borderRadius="var(--radius-full)" />
        </div>
      </div>
    </article>
  );
};
