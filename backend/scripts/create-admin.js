/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import { createDb } from '../src/db.js';
import { getRequiredEnv, loadLocalEnv } from '../src/load-local-env.js';

function getOptionalEnv(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === null ? fallback : String(value);
}

async function createOrUpdateAdmin() {
  loadLocalEnv();
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  const email = getRequiredEnv('ADMIN_EMAIL').trim().toLowerCase();
  const password = getRequiredEnv('ADMIN_PASSWORD');
  const name = getOptionalEnv('ADMIN_NAME', 'Administrador').trim() || 'Administrador';
  const phone = getOptionalEnv('ADMIN_PHONE', '(00) 00000-0000').trim();

  try {
    console.log(`Verificando se o usuário ${email} já existe...`);
    const { rows } = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    const hash = await bcrypt.hash(password, 12);

    if (rows.length > 0) {
      console.log('Usuário já existe. Atualizando cargo para admin e resetando senha...');
      await db.query(
        'UPDATE users SET password = $1, role = $2, name = $3, phone = COALESCE(NULLIF($4, \'\'), phone) WHERE email = $5',
        [hash, 'admin', name, phone, email]
      );
      console.log('✅ Usuário atualizado com sucesso!');
      return;
    }

    console.log('Criando novo usuário administrador...');
    const avatar = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

    await db.query(
      `INSERT INTO users (name, email, password, role, phone, avatar)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, hash, 'admin', phone, avatar || 'AD']
    );
    console.log('✅ Administrador criado com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

createOrUpdateAdmin();

