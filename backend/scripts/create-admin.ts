/* eslint-disable no-console */
import { hashPassword } from '../src/core/utils/crypto.ts';
import { neon } from '@neondatabase/serverless';
import { getRequiredEnv, loadLocalEnv } from '../src/core/load-local-env.ts';

function getOptionalEnv(name: string, fallback: string = ''): string {
  const value = process.env[name];
  return value === undefined || value === null ? fallback : String(value);
}

async function createOrUpdateAdmin(): Promise<void> {
  loadLocalEnv();
  const sql = neon(getRequiredEnv('DATABASE_URL'));

  const email = getRequiredEnv('ADMIN_EMAIL').trim().toLowerCase();
  const password = getRequiredEnv('ADMIN_PASSWORD');
  const name = getOptionalEnv('ADMIN_NAME', 'Administrador').trim() || 'Administrador';
  const phone = getOptionalEnv('ADMIN_PHONE', '(00) 00000-0000').trim();

  try {
    console.log(`Verificando se o usuário ${email} já existe...`);
    const rows = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email})`;

    const hash = await hashPassword(password);

    if (rows.length > 0) {
      console.log('Usuário já existe. Atualizando cargo para admin e resetando senha...');
      await sql`UPDATE users SET password = ${hash}, role = 'admin', name = ${name}, phone = COALESCE(NULLIF(${phone}, ''), phone) WHERE email = ${email}`;
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

    await sql`INSERT INTO users (name, email, password, role, phone, avatar)
       VALUES (${name}, ${email}, ${hash}, 'admin', ${phone}, ${avatar || 'AD'})`;
    console.log('✅ Administrador criado com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro:', err);
    process.exitCode = 1;
  }
}

createOrUpdateAdmin();
