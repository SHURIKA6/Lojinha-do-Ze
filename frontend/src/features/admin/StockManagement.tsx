'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPackage, 
  FiSearch, 
  FiFilter, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiAlertTriangle,
  FiRefreshCw,
  FiImage
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getProducts, 
  deleteProduct, 
  formatCurrency 
} from '@/lib/api';
import { Product } from '@/types';
import '@/app/admin/dashboard.css';

export default function StockManagement() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      addToast('Não foi possível carregar o estoque.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadProducts();
    }
  }, [isAdmin]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;

    try {
      setDeletingId(id);
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      addToast(`Produto "${name}" excluído com sucesso.`, 'success');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      addToast('Erro ao excluir o produto. Verifique se ele não possui pedidos vinculados.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(searchLower) || 
        (product.code || '').toLowerCase().includes(searchLower);
      
      return matchesCategory && matchesSearch;
    });
  }, [products, filterCategory, searchTerm]);

  const stockStats = useMemo(() => {
    return {
      total: products.length,
      lowStock: products.filter(p => (p.stock || 0) <= (p.min_stock || 5) && (p.stock || 0) > 0).length,
      outOfStock: products.filter(p => (p.stock || 0) <= 0).length,
    };
  }, [products]);

  if (loading && products.length === 0) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando inventário...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiPackage />
            Estoque e Catálogo
          </span>
          <h1>Gestão de Estoque</h1>
          <p className="page-header__subtitle">
            Controle de produtos, níveis de estoque e precificação.
          </p>
        </div>
        <div className="page-header__actions">
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={loadProducts}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
            Sincronizar
          </button>
          <button 
            className="btn btn--primary btn--sm"
            onClick={() => addToast('Funcionalidade de adição em desenvolvimento.', 'info')}
          >
            <FiPlus /> Novo Produto
          </button>
        </div>
      </div>

      <div className="grid grid--cols-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <span className="stat-card__label">Total de Itens</span>
          <span className="stat-card__value">{stockStats.total}</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--warning-500)' }}>
          <span className="stat-card__label">Estoque Baixo</span>
          <span className="stat-card__value" style={{ color: 'var(--warning-600)' }}>{stockStats.lowStock}</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger-500)' }}>
          <span className="stat-card__label">Sem Estoque</span>
          <span className="stat-card__value" style={{ color: 'var(--danger-600)' }}>{stockStats.outOfStock}</span>
        </div>
      </div>

      <div className="panel" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="table-search">
            <FiSearch className="table-search__icon" />
            <input 
              type="text" 
              placeholder="Buscar por Nome ou Código SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FiFilter style={{ opacity: 0.5 }} />
            <select 
              className="form-select" 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ margin: 0, width: '200px', minHeight: '3rem' }}
            >
              <option value="all">Todas Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Foto</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Estoque</th>
                <th>Preço Venda</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isLowStock = (product.stock || 0) <= (product.min_stock || 5);
                  const isOutOfStock = (product.stock || 0) <= 0;
                  
                  return (
                    <tr key={product.id} style={{ opacity: deletingId === product.id ? 0.6 : 1 }}>
                      <td>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '8px', 
                          backgroundColor: 'var(--gray-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {product.photo ? (
                            <img src={product.photo} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FiImage style={{ color: 'var(--gray-400)' }} />
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>
                          SKU: {product.code || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge--secondary">{product.category}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            fontWeight: 700, 
                            color: isOutOfStock ? 'var(--danger-600)' : (isLowStock ? 'var(--warning-600)' : 'inherit')
                          }}>
                            {product.stock || 0}
                          </span>
                          {isLowStock && !isOutOfStock && <FiAlertTriangle className="text-warning" title="Estoque Baixo" />}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800 }}>{formatCurrency(product.sale_price || product.price || 0)}</td>
                      <td>
                        <span className={`badge badge--${product.is_active !== false ? 'success' : 'neutral'}`}>
                          {product.is_active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                          <button 
                            className="btn btn--sm btn--secondary" 
                            title="Editar"
                            onClick={() => addToast('Edição em desenvolvimento.', 'info')}
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="btn btn--sm btn--danger" 
                            title="Excluir"
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={deletingId === product.id}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="table-empty">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
