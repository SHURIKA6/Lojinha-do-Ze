'use client';

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiStar, FiCpu, FiInfo, FiTrash2 } from 'react-icons/fi';

interface Message {
  role: 'bot' | 'user';
  content: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Olá! Sou o Guardião da Lojinha, sua Inteligência Artificial dedicada. Como posso ajudar com a gestão da loja hoje? Posso analisar vendas, sugerir estoque ou tirar dúvidas sobre o sistema.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Houve uma oscilação na minha rede neural. Poderia repetir a pergunta?' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (confirm('Deseja limpar o histórico atual da conversa?')) {
      setMessages([{ role: 'bot', content: 'Histórico limpo. Como posso ajudar agora?' }]);
    }
  };

  return (
    <div className="fade-in admin-ia-page">
      <div className="ia-page-container">
        
        {/* Sidebar de Informações */}
        <aside className="ia-sidebar dashboard-card">
          <div className="ia-sidebar__header">
            <FiCpu className="icon-gold" />
            <h3>Guardião da Lojinha</h3>
          </div>
          <p className="ia-sidebar__desc">
            Sua IA especialista em varejo, pronta para transformar dados em estratégia.
          </p>
          
          <div className="ia-sidebar__features">
            <div className="feature-item">
              <FiInfo />
              <span>Analise de tendências</span>
            </div>
            <div className="feature-item">
              <FiInfo />
              <span>Previsão de estoque</span>
            </div>
            <div className="feature-item">
              <FiInfo />
              <span>Sugestões de preços</span>
            </div>
          </div>

          <button className="btn-admin btn-admin--secondary" onClick={clearChat} style={{ marginTop: 'auto', width: '100%' }}>
            <FiTrash2 /> Limpar Conversa
          </button>
        </aside>

        {/* Área Principal de Chat */}
        <main className="ia-chat-main dashboard-card">
          <header className="ia-chat-header">
            <div className="ia-status">
              <span className="status-dot status-dot--online"></span>
              <span>Sistemas Ativos</span>
            </div>
            <div className="ia-badge">POWERED BY GEMINI</div>
          </header>

          <div className="ia-messages-container">
            {(Array.isArray(messages) ? messages : []).map((msg, idx) => (
              <div key={idx} className={`ia-msg ia-msg--${msg.role}`}>
                <div className="ia-msg__avatar">
                  {msg.role === 'bot' ? <FiCpu /> : <FiStar />}
                </div>
                <div className="ia-msg__bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="ia-msg ia-msg--bot">
                <div className="ia-msg__avatar animate-pulse">
                  <FiCpu />
                </div>
                <div className="ia-msg__bubble opacity-70">
                  Analisando dados...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="ia-chat-footer">
            <div className="ia-input-wrapper">
              <input 
                type="text" 
                placeholder="Ex: Como foram as vendas de ontem? Qual produto está acabando?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="admin-input"
              />
              <button 
                className="btn-admin btn-admin--primary ia-send-btn"
                onClick={handleSend}
                disabled={isTyping}
              >
                <FiSend />
              </button>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
