export const id = '010_add_full_text_search';

export async function up(client: any) {
  // Adding a generated column for the search vector
  await client.query(`
    ALTER TABLE products 
    ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
      setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(category, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(description, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(code, '')), 'D')
    ) STORED;
  `);

  // Creating GIN index for fast full-text search
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);
  `);
}

export async function down(client: any) {
  await client.query(`DROP INDEX IF NOT EXISTS idx_products_search_vector;`);
  await client.query(`ALTER TABLE products DROP COLUMN IF NOT EXISTS search_vector;`);
}
