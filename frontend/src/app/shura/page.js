'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCode, FiCpu, FiGithub, FiZap } from 'react-icons/fi';
import styles from './Shura.module.css';

export default function ShuraPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            <FiArrowLeft /> Voltar para a Loja
          </Link>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>Mestre Shura</h1>
            <p className={styles.subtitle}>Engineering the Future, One Line at a Time</p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <FiCode className={styles.icon} />
              <h2>Full Stack Wizard</h2>
            </div>
            <p>Construindo soluções robustas com React, Next.js e Node.js.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <FiZap className={styles.icon} />
              <h2>Performance first</h2>
            </div>
            <p>Aplicações leves, seguras e extremamente rápidas.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <FiCpu className={styles.icon} />
              <h2>AI Integration</h2>
            </div>
            <p>Especialista em fluxos inteligentes e automação moderna.</p>
          </div>
        </div>

        <div className={styles.footer}>
          <p>© 2026 - Lojinha do Zé | Powered by <strong>Shura Architecture</strong></p>
          <div className={styles.social}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <FiGithub /> Github
            </a>
          </div>
        </div>
      </div>
      
      <div className={styles.background}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
      </div>
    </div>
  );
}
