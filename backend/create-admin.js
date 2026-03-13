import bcrypt from 'bcryptjs';
import { createDb } from './src/db.js';
import { getRequiredEnv, loadLocalEnv } from './src/load-local-env.js';

async function createAdmin() {
  loadLocalEnv();
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  const email = 'fdsuno@gmail.com';
  const password = 'fernando10';
  const name = 'Fernando Ribeiro';

  try {
    console.log(`Verificando se o usuário ${email} já existe...`);
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    const hash = await bcrypt.hash(password, 12);

    if (rows.length > 0) {
      console.log('Usuário já existe. Atualizando cargo para admin e resetando senha...');
      await db.query(
        'UPDATE users SET password = $1, role = $2, name = $3 WHERE email = $4',
        [hash, 'admin', name, email]
      );
      console.log('✅ Usuário atualizado com sucesso!');
    } else {
      console.log('Criando novo usuário administrador...');
      await db.query(
        `INSERT INTO users (name, email, password, role, phone, avatar)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, email, hash, 'admin', '(00) 00000-0000', 'FR']
      );
      console.log('✅ Administrador criado com sucesso!');
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await db.close();
  }
}

createAdmin();
