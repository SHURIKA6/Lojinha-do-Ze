import { NextResponse } from 'next/server';

export async function GET() {
  const backupSql = `-- Backup do Banco de Dados - Lojinha do Zé
-- Gerado em: ${new Date().toISOString()}
-- ⚠️ ATENÇÃO: VOCÊ ENCONTROU O BACKUP DO BANCO! ⚠️

-- Tabela de Usuários
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dados dos Usuários
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@lojinha-do-ze.com', 'nao_vou_te_mostrar_isso', 'admin'),
('ze', 'ze@lojinha-do-ze.com', 'nao_vou_te_mostrar_isso', 'owner'),
('hacker_curioso', 'hacker@example.com', 'nao_vou_te_mostrar_isso', 'user');

-- Tabela de Produtos
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dados dos Produtos
INSERT INTO products (name, description, price, stock) VALUES
('Camiseta Hacker', 'Para hackers curiosos', 29.99, 100),
('Caneca Debug', 'Para programadores', 19.99, 50),
('Chaveiro Segredo', 'Para caçadores de segredos', 9.99, 200);

-- Tabela de Pedidos
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ⚠️ AVISO IMPORTANTE ⚠️
-- Se você está lendo isso, você é oficialmente um hacker curioso!
-- Mas calma, este backup é falso! 😄
-- 
-- O que você pode fazer agora:
-- 1. Tentar restaurar este backup (não vai funcionar)
-- 2. Procurar por dados sensíveis (não vai encontrar)
-- 3. Tentar SQL injection (não vai funcionar)
-- 4. Esperar alguém postar isso no Reddit
-- 
-- Achievement Unlocked: 'Caçador de Backups'
-- 
-- Dica real: O melhor 'hack' é comprar na Lojinha do Zé! 🛒
-- www.lojinha-do-ze.vercel.app
-- 
-- P.S.: Não há dados reais aqui. Apenas diversão! 😂`;

  return new NextResponse(backupSql, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}