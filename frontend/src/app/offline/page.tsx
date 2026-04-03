'use client';

import React from 'react';
import { FiWifi, FiRefreshCw, FiHome } from 'react-icons/fi';
import Link from 'next/link';

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="offline-page">
      <div className="offline-content">
        <div className="offline-icon">
          <FiWifi />
        </div>
        
        <h1 className="offline-title">Sem Conexão</h1>
        
        <p className="offline-message">
          Você está offline. Verifique sua conexão com a internet e tente novamente.
        </p>
        
        <div className="offline-actions">
          <button 
            onClick={handleRefresh}
            className="offline-btn offline-btn-primary"
          >
            <FiRefreshCw />
            Tentar Novamente
          </button>
          
          <Link href="/" className="offline-btn offline-btn-secondary">
            <FiHome />
            Voltar ao Início
          </Link>
        </div>
        
        <div className="offline-tips">
          <h3>Dicas para reconectar:</h3>
          <ul>
            <li>Verifique se o Wi-Fi está ligado</li>
            <li>Verifique se há dados móveis disponíveis</li>
            <li>Tente se mover para um local com melhor sinal</li>
            <li>Reinicie seu roteador se estiver usando Wi-Fi</li>
          </ul>
        </div>
      </div>
      
      <style jsx>{`
        .offline-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }
        
        .offline-content {
          background: white;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .offline-icon {
          font-size: 4rem;
          color: #667eea;
          margin-bottom: 20px;
        }
        
        .offline-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 16px;
        }
        
        .offline-message {
          color: #666;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        
        .offline-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }
        
        .offline-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          border: none;
          font-size: 1rem;
        }
        
        .offline-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .offline-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .offline-btn-secondary {
          background: #f8f9fa;
          color: #667eea;
          border: 2px solid #667eea;
        }
        
        .offline-btn-secondary:hover {
          background: #667eea;
          color: white;
        }
        
        .offline-tips {
          text-align: left;
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
        }
        
        .offline-tips h3 {
          color: #1a1a1a;
          margin-bottom: 12px;
          font-size: 1rem;
        }
        
        .offline-tips ul {
          color: #666;
          padding-left: 20px;
          margin: 0;
        }
        
        .offline-tips li {
          margin-bottom: 8px;
          line-height: 1.4;
        }
        
        @media (max-width: 480px) {
          .offline-content {
            padding: 30px 20px;
          }
          
          .offline-title {
            font-size: 1.5rem;
          }
          
          .offline-icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
