const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const devVarsPath = path.join(__dirname, '.dev.vars');
  
  let content = '';
  if (fs.existsSync(devVarsPath)) {
    content = fs.readFileSync(devVarsPath, 'utf8');
  } else if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  content.split(/\r?\n/).forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function run() {
  loadEnv();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const email = 'fdsuno@gmail.com';
  const password = 'fernando10';
  const name = 'Fernando Ribeiro';

  try {
    console.log(`Verificando usuário ${email}...`);
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const hash = await bcrypt.hash(password, 12);

    if (rows.length > 0) {
      console.log('Atualizando admin existente...');
      await pool.query(
        'UPDATE users SET password = $1, role = $2, name = $3 WHERE email = $4',
        [hash, 'admin', name, email]
      );
    } else {
      console.log('Criando novo admin...');
      await pool.query(
        `INSERT INTO users (name, email, password, role, phone, avatar)
         VALUES ($1, $2, $3, 'admin', '(11) 99999-0000', 'FR')`,
        [name, email, hash]
      );
    }
    console.log('✅ Tudo pronto! Pode logar.');
  } catch (err) {
    console.error('❌ Erro fatal:', err.message);
  } finally {
    await pool.end();
  }
}

run();
