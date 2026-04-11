'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiStar } from 'react-icons/fi';

interface Message {
  role: 'bot' | 'user';
  content: string;
}

export default function AdminAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Olá! Sou o Guardião da Lojinha. Como posso te ajudar com os negócios hoje?' }
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
        content: 'Desculpe, tive um problema na minha conexão mística. Tente novamente em instantes!' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="admin-assistant">
      {isOpen && (
        <div className="admin-assistant__window">
          <header className="admin-assistant__window-header">
            <FiStar />
            <span className="admin-assistant__window-title">Guardião da Lojinha</span>
          </header>

          <div className="admin-assistant__messages">
            {(Array.isArray(messages) ? messages : []).map((msg, idx) => (
              <div key={idx} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div className="chat-msg chat-msg--bot">
                <span className="animate-pulse">Escrevendo...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="admin-assistant__input-area">
            <input
              type="text"
              className="admin-assistant__input"
              placeholder="Pergunte algo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="admin-assistant__send-btn" onClick={handleSend}>
              <FiSend size={14} />
            </button>
          </div>
        </div>
      )}

      <button 
        className={`admin-assistant__bubble ${isOpen ? 'admin-assistant__bubble--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FiX /> : <FiMessageSquare />}
      </button>
    </div>
  );
}
