'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './easter-egg.module.css';

export default function EasterEggPage() {
  const canvasRef = useRef(null);
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [matrixMode, setMatrixMode] = useState(false);
  const [particles, setParticles] = useState([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [clickCount, setClickCount] = useState(0);
  const [showCredits, setShowCredits] = useState(false);

  const secretMessages = [
    "🎉 PARABÉNS! Você encontrou o Easter Egg secreto!",
    "🕵️ Você é um verdadeiro detetive digital!",
    "🚀 Bem-vindo ao Clube dos que Descobrem Segredos!",
    "💎 Este easter egg vale mais que bitcoin!",
    "🐉 Você domou o dragão do código!",
    "🎮 Modo Desbloqueado: DESENVOLVEDOR SUPREMO",
    "🌌 Você viu além da matrix...",
    "⚡ Seu poder de curiosidade está em nível máximo!"
  ];

  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  // Matrix rain effect
  useEffect(() => {
    if (!matrixMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテト';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = `rgba(0, 255, 0, ${Math.random() * 0.5 + 0.5})`;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(drawMatrix, 35);
    return () => clearInterval(interval);
  }, [matrixMode]);

  // Konami code detector
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === konamiCode[konamiIndex]) {
        setKonamiIndex(prev => {
          const newIndex = prev + 1;
          if (newIndex === konamiCode.length) {
            setMatrixMode(true);
            setShowSecret(true);
            setMessages(prev => [...prev, "🎮 KONAMI CODE ATIVADO! Modo Matrix Desbloqueado!"]);
            return 0;
          }
          return newIndex;
        });
      } else {
        setKonamiIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex]);

  // Particle system
  useEffect(() => {
    const createParticle = () => {
      const id = Date.now() + Math.random();
      const particle = {
        id,
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 10,
        size: Math.random() * 8 + 2,
        speedY: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        opacity: 1
      };
      setParticles(prev => [...prev.slice(-50), particle]);
    };

    const interval = setInterval(createParticle, 200);
    return () => clearInterval(interval);
  }, []);

  // Update particles
  useEffect(() => {
    const updateParticles = () => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            y: p.y - p.speedY,
            x: p.x + p.speedX,
            opacity: p.opacity - 0.005
          }))
          .filter(p => p.opacity > 0 && p.y > -10)
      );
    };

    const interval = setInterval(updateParticles, 16);
    return () => clearInterval(interval);
  }, []);

  // Mouse trail
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Show messages with animation
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([secretMessages[0]]);
    }

    const interval = setInterval(() => {
      setCurrentMessage(prev => {
        const next = prev + 1;
        if (next >= secretMessages.length) {
          setShowCredits(true);
          return prev;
        }
        setMessages(prevMsgs => [...prevMsgs, secretMessages[next]]);
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Secret click sequence
  const handleSecretClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      if (newCount === 7) {
        setMessages(prev => [...prev, "🔓 SEGREDO FINAL DESBLOQUEADO! Você é incrível!"]);
        setShowSecret(true);
        return 0;
      }
      return newCount;
    });
  };

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      {matrixMode && (
        <canvas
          ref={canvasRef}
          className={styles.matrixCanvas}
        />
      )}

      {/* Particle system */}
      <div className={styles.particlesContainer}>
        {particles.map(p => (
          <div
            key={p.id}
            className={styles.particle}
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity
            }}
          />
        ))}
      </div>

      {/* Mouse follower */}
      <div
        className={styles.mouseFollower}
        style={{
          left: mousePos.x,
          top: mousePos.y
        }}
      />

      {/* Main content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title} onClick={handleSecretClick}>
            🥚 EASTER EGG SECRETO 🥚
          </h1>
          <div className={styles.sparkles}>✨🌟💫⭐✨🌟💫⭐</div>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={styles.message}
              style={{
                animationDelay: `${i * 0.1}s`,
                opacity: i === messages.length - 1 ? 1 : 0.7
              }}
            >
              {msg}
            </div>
          ))}
        </div>

        {showCredits && (
          <div className={styles.credits}>
            <div className={styles.creditTitle}>🏆 CRÉDITS ESPECIAIS 🏆</div>
            <div className={styles.creditText}>
              Parabéns por ter descoberto este Easter Egg secreto!
            </div>
            <div className={styles.creditText}>
              Você faz parte dos 0.001% dos usuários mais curiosos!
            </div>
            <div className={styles.secretBadge}>
              🎖️ DETETIVE DIGITAL - NÍVEL MÁXIMO 🎖️
            </div>
          </div>
        )}

        <div className={styles.instructions}>
          <div className={styles.instructionItem}>
            🎮 Digite o Konami Code (↑↑↓↓←→←→BA) para o Modo Matrix
          </div>
          <div className={styles.instructionItem}>
            🖱️ Mova o mouse para ver os rastros mágicos
          </div>
          <div className={styles.instructionItem}>
            👆 Clique 7 vezes no título para um segredo final
          </div>
        </div>

        <button
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          🚪 Voltar ao Login Normal
        </button>

        <div className={styles.footer}>
          <div className={styles.footerText}>
            Este Easter Egg foi criado com ❤️ para você!
          </div>
          <div className={styles.footerSubtext}>
            Lojinha do Zé - Onde os segredos ganham vida
          </div>
        </div>
      </div>
    </div>
  );
}