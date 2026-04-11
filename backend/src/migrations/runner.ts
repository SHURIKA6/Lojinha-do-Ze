import { neon } from '@neondatabase/serverless';

/**
 * Interface para uma migração
 */
interface Migration {
  name: string;
  up: (sql: ReturnType<typeof neon>) => Promise<void>;
}

/**
 * Runner de migrações simplificado para Neon Cloudflare Workers.
 * Suporta execução de comandos múltiplos separados por ';' para contornar
 * limitações do driver serverless.
 */
export async function runMigrations(sql: ReturnType<typeof neon>, migrations: Migration[]) {
  console.log('Iniciando migrações...');

  // Criar tabela de controle se não existir
  await sql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const executedMigrations = await sql<{ name: string }[]>(`SELECT name FROM _migrations`);
  const executedNames = new Set(executedMigrations.map(m => m.name));

  for (const migration of migrations) {
    if (!executedNames.has(migration.name)) {
      console.log(`Executando migração: ${migration.name}`);
      
      // Criamos um proxy para o SQL que faz o split de comandos se necessário
      const wrappedSql = async (query: string) => {
        // Remove comentários e faz split por ponto-e-vírgula
        const commands = query
          .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') // Remove comentários
          .split(';')
          .map(c => c.trim())
          .filter(c => c.length > 0);

        for (const cmd of commands) {
          await sql(cmd);
        }
      };

      try {
        await migration.up(wrappedSql as any);
        await sql(`INSERT INTO _migrations (name) VALUES ($1)`, [migration.name]);
        console.log(`✅ ${migration.name} concluída.`);
      } catch (error) {
        console.error(`❌ Erro na migração ${migration.name}:`, error);
        throw error;
      }
    }
  }

  console.log('Todas as migrações processadas.');
}
