'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiBook, FiFeather, FiMap, FiCoffee } from 'react-icons/fi';
import styles from '@/app/shura/Shura.module.css';

export default function ShuraPageClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.tavern}>
      <div className={styles.tavernBg}>
        <div className={styles.overlay}></div>
      </div>

      <div className={styles.torchLight}></div>

      <div className={styles.content}>
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            <FiArrowLeft /> Deixar a Taverna
          </Link>
          <div className={styles.scroll}>
            <h1 className={styles.title}>Grão-Mestre Shura</h1>
            <p className={styles.subtitle}>Relatos da Alquimia Digital & Feitiçaria de Código</p>
          </div>
        </div>

        <div className={styles.parchmentGrid}>
          <div className={styles.parchment}>
            <div className={styles.cardHeader}>
              <FiFeather className={styles.icon} />
              <h2>Escrituras de Código</h2>
            </div>
            <p>Forjando algoritmos em pergaminhos de silício, transformando problemas em soluções mágicas.</p>
          </div>

          <div className={styles.parchment}>
            <div className={styles.cardHeader}>
              <FiBook className={styles.icon} />
              <h2>Grimório Admin</h2>
            </div>
            <p>O mestre dos painéis reais, onde cada segredo da gestão é revelado com clareza e poder.</p>
          </div>

          <div className={styles.parchment}>
            <div className={styles.cardHeader}>
              <FiMap className={styles.icon} />
              <h2>Mapas Imersivos</h2>
            </div>
            <p>Navegando pelos mares turbulentos do Full Stack, guiando viajantes para destinos seguros.</p>
          </div>
        </div>

        <div className={styles.footer}>
          <p>© Era de 2026 - Lojinha do Zé | Selo do <strong>Grande Clã Shura</strong></p>
          <div className={styles.tavernBrand}>
            <FiCoffee /> <span>Toma uma caneca e relaxa!</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Almendra:ital,wght@0,400;0,700;1,400;1,700&family=MedievalSharp&display=swap');
      `}</style>
    </div>
  );
}
