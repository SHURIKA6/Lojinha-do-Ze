export const id = '009_normalize_user_roles';

export async function up(client: any) {
  await client.query(`
    UPDATE users
    SET role = 'admin'
    WHERE role = 'editor';
  `);

  const { rows } = await client.query(`
    SELECT id, role
    FROM users
    WHERE role NOT IN ('customer', 'admin', 'shura');
  `);

  if (rows.length > 0) {
    const invalidRoles = rows.map((row: any) => `${row.id}:${row.role}`).join(', ');
    throw new Error(`Cargos inválidos restantes após normalização: ${invalidRoles}`);
  }
}
