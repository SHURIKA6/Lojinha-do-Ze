import { Database } from '../../core/types';
import { cacheService } from '../system/cacheService';
import { CACHE_PREFIXES } from '../../core/domain/cacheKeys';
import { CATALOG_CACHE_TTL_SECONDS } from '../../core/domain/constants';
import * as productRepo from './repository';
import {
  cleanOptionalString,
  isUniqueViolation,
  uniqueFieldLabel,
} from '../../core/utils/normalize';
import { logger } from '../../core/utils/logger';

export async function getProducts(db: Database, limit: number, offset: number) {
  return productRepo.listProducts(db, limit, offset);
}

export async function getCatalog(
  db: Database,
  options: { 
    search?: string; 
    category?: string; 
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    limit: number; 
    offset: number;
  }
) {
  const { search, category, minPrice, maxPrice, sortBy, limit, offset } = options;
  const cacheKey = `${CACHE_PREFIXES.CATALOG}${limit}_${offset}_${search || ''}_${category || ''}_${minPrice || ''}_${maxPrice || ''}_${sortBy || ''}`;

  const cached = await cacheService.get(cacheKey, (options as any).env?.CACHE_KV);
  if (cached) {
    return cached;
  }

  const { rows, totalCount } = await productRepo.searchProducts(db, options);

  const categories: Record<string, { name: string; products: any[] }> = {};
  for (const product of rows) {
    if (!categories[product.category]) {
      categories[product.category] = {
        name: product.category,
        products: [],
      };
    }
    categories[product.category].products.push(product);
  }

  const response = {
    categories: Object.values(categories),
    total: totalCount,
    limit,
    offset,
  };

  await cacheService.set(cacheKey, response, CATALOG_CACHE_TTL_SECONDS, (options as any).env?.CACHE_KV);
  return response;
}

export async function getProduct(db: Database, id: string) {
  return productRepo.getProductById(db, id);
}

export async function createProduct(db: Database, payload: any) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const productData = {
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: cleanOptionalString(payload.description) || '',
      photo: cleanOptionalString(payload.photo) || '',
      category: payload.category,
      quantity: payload.quantity ?? 0,
      min_stock: payload.min_stock ?? 5,
      cost_price: payload.cost_price ?? 0,
      sale_price: payload.sale_price ?? 0,
      supplier: cleanOptionalString(payload.supplier) || '',
      is_active: payload.is_active ?? true,
    };

    const product = await productRepo.createProduct(client, productData);

    if (product.quantity > 0 && product.cost_price > 0) {
      const totalCost = product.quantity * product.cost_price;
      await productRepo.createStockTransaction(client, {
        type: 'despesa',
        category: 'Compra de estoque',
        description: `Estoque inicial: ${product.name} (${product.quantity} un)`,
        value: totalCost,
      });
    }

    await client.query('COMMIT');
    await cacheService.invalidateByPrefix(CACHE_PREFIXES.CATALOG, (payload as any).env?.CACHE_KV);
    return product;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (isUniqueViolation(error)) {
      throw { type: 'UNIQUE_VIOLATION', label: uniqueFieldLabel(error) };
    }
    logger.error('Erro no ProductService.createProduct', error as Error);
    throw error;
  } finally {
    if (client.release) client.release();
  }
}

export async function updateProduct(db: Database, id: string, payload: any) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const oldProduct = await productRepo.getProductForUpdate(client, id);
    if (!oldProduct) {
      await client.query('ROLLBACK');
      throw { type: 'NOT_FOUND' };
    }

    const updates: any = {};
    if (payload.code !== undefined) updates.code = payload.code.trim();
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.description !== undefined) updates.description = cleanOptionalString(payload.description) || '';
    if (payload.photo !== undefined) updates.photo = cleanOptionalString(payload.photo) || '';
    if (payload.category !== undefined) updates.category = payload.category;
    if (payload.quantity !== undefined) updates.quantity = payload.quantity;
    if (payload.min_stock !== undefined) updates.min_stock = payload.min_stock;
    if (payload.cost_price !== undefined) updates.cost_price = payload.cost_price;
    if (payload.sale_price !== undefined) updates.sale_price = payload.sale_price;
    if (payload.supplier !== undefined) updates.supplier = cleanOptionalString(payload.supplier) || '';
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    const updatedProduct = await productRepo.updateProduct(client, id, updates);

    if (payload.quantity !== undefined && payload.quantity > oldProduct.quantity) {
      const diff = payload.quantity - oldProduct.quantity;
      const currentCostPrice = payload.cost_price !== undefined ? payload.cost_price : oldProduct.cost_price;

      if (currentCostPrice > 0) {
        const totalCost = diff * currentCostPrice;
        await productRepo.createStockTransaction(client, {
          type: 'despesa',
          category: 'Compra de estoque',
          description: `Reposição: ${updatedProduct.name} (+${diff} un)`,
          value: totalCost,
        });
      }
    }

    await client.query('COMMIT');
    await cacheService.invalidateByPrefix(CACHE_PREFIXES.CATALOG, (payload as any).env?.CACHE_KV);
    return updatedProduct;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (isUniqueViolation(error)) {
      throw { type: 'UNIQUE_VIOLATION', label: uniqueFieldLabel(error) };
    }
    if ((error as any).type === 'NOT_FOUND') throw error;
    logger.error('Erro no ProductService.updateProduct', error as Error);
    throw error;
  } finally {
    if (client.release) client.release();
  }
}

export async function deleteProduct(db: Database, id: string, env?: any) {
  const success = await productRepo.deleteProduct(db, id);
  if (success) {
    await cacheService.invalidateByPrefix(CACHE_PREFIXES.CATALOG, env?.CACHE_KV);
  }
  return success;
}
