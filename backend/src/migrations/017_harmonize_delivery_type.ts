export const id = '017_harmonize_delivery_type';

/**
 * Harmoniza os valores de delivery_type na tabela orders.
 * Converte 'entrega' para 'delivery' e 'retirada' para 'pickup'.
 * Atualiza o valor padrão da coluna para 'delivery'.
 * @param client - Cliente do banco de dados
 */
export async function up(client: any): Promise<void> {
  // 1. Atualizar dados existentes
  await client.query(`
    UPDATE orders SET delivery_type = 'delivery' WHERE delivery_type = 'entrega';
    UPDATE orders SET delivery_type = 'pickup' WHERE delivery_type = 'retirada';
  `);

  // 2. Alterar o valor padrão da coluna
  await client.query(`
    ALTER TABLE orders ALTER COLUMN delivery_type SET DEFAULT 'delivery';
  `);
}
