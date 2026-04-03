/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import { createDb } from '../src/db.js';
import { getRequiredEnv, loadLocalEnv } from '../src/load-local-env.js';

async function createEasterEggUser() {
  loadLocalEnv();
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  const email = 'teste@gmail.com';
  const password = '12345678';
  const name = 'Easter Egg User';
  const phone = '(11) 99999-9999';

  try {
    console.log(`Verificando se o usuário ${email} já existe...`);
    const { rows } = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    const hash = await bcrypt.hash(password, 12);

    if (rows.length > 0) {
      console.log('Usuário já existe. Atualizando senha...');
      await db.query(
        'UPDATE users SET password = $1, name = $2, phone = $3 WHERE email = $4',
        [hash, name, phone, email]
      );
      console.log('✅ Usuário atualizado com sucesso!');
      return;
    }

    console.log('Criando novo usuário de teste...');
    await db.query(
      `INSERT INTO users (name, email, password, role, phone, avatar)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, hash, 'customer', phone, 'EE']
    );
    console.log('✅ Usuário de teste criado com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

createEasterEggUser();