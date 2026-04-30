import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0lKf2oLxpyUB@ep-blue-bar-ajrpgupt-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function test() {
  const sql = neon(DATABASE_URL, { fullResults: true });
  
  const options = {
    category: 'Cápsulas',
    sortBy: 'relevance',
    limit: 50,
    offset: 0
  };

  try {
    console.log('Testing searchProducts logic with options:', options);
    
    const whereClauses = ['is_active = TRUE', 'quantity > 0'];
    const queryParams = [];

    if (options.category) {
      queryParams.push(options.category);
      whereClauses.push(`category = $${queryParams.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    
    console.log('Running Count Query...');
    const countRes = await sql.query(`SELECT COUNT(*) FROM products WHERE ${whereSql}`, queryParams);
    console.log('Count Result:', countRes);
    const totalCount = parseInt(countRes.rows[0].count);
    console.log('Total Count:', totalCount);

    let orderBySql = 'category, name';
    // No search, so relevance defaults to category, name
    
    const limitOffsetParams = [...queryParams, options.limit, options.offset];
    console.log('Running Data Query...');
    const { rows } = await sql.query(
      `SELECT id, code, name, description, photo, category, sale_price, quantity
       FROM products
       WHERE ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT $${limitOffsetParams.length - 1} OFFSET $${limitOffsetParams.length}`,
      limitOffsetParams
    );
    
    console.log('Rows found:', rows.length);
    console.log('First row category:', rows[0]?.category);

  } catch (err) {
    console.error('ERROR during test:', err);
    if (err.stack) console.error(err.stack);
  }
}

test();
