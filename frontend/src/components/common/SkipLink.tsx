'use client';

import React, { useState } from 'react';

export default function SkipLink() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: isFocused ? '6px' : '-40px',
        left: '6px',
        background: '#667eea',
        color: 'white',
        padding: '8px',
        textDecoration: 'none',
        borderRadius: '4px',
        zIndex: 10000,
        transition: 'top 0.3s',
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      Pular para o conteúdo principal
    </a>
  );
}
