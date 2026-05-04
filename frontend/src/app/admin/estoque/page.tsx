'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import AppImage from '@/components/ui/AppImage';
import { useConfirm } from '@/components/ui/ConfirmDialogProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  createProduct,
  deleteProduct,
  formatCurrency,
  getImageUrl,
  getProducts,
  updateProduct,
  uploadImage,
} from '@/core/api';
import {
  FiAlertTriangle,
  FiEdit2,
  FiImage,
  FiPackage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
} from 'react-icons/fi';
import { Product } from '@/types';

const categories = [
  'Óleos Essenciais',
  'Óleos',
  'Chás e Infusões',
  'Naturais',
  'Cosméticos Naturais',
  'Suplementos',
  'Cápsulas',
  'Tinturas',
  'Cremes',
  'Outros',
];

interface ProductForm {
  code: string;
  name: string;
  description: string;
  photo: string;
  category: string;
  quantity: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  supplier: string;
  is_active: boolean;
}

const initialForm: ProductForm = {
  code: '',
  name: '',
  description: '',
  photo: '',
  category: 'Cápsulas',
  quantity: 0,
  min_stock: 0,
  cost_price: 0,
  sale_price: 0,
  supplier: '',
  is_active: true,
};

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(initialForm);

  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.code?.toLowerCase() || '').includes(search.toLowerCase());
      const matchCategory = !categoryFilter || product.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [categoryFilter, products, search]);

  const lowStock = products.filter(
    (product) => Number(product.quantity || 0) <= Number(product.min_stock || 0)
  ).length;
  const visibleProducts = products.filter((product) => product.is_active).length;

  const openNew = useCallback(() => {
    setEditingProduct(null);
    setForm(initialForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setForm({
      code: product.code || '',
      name: product.name,
      description: product.description || '',
      photo: product.photo || '',
      category: product.category || 'Outros',
      quantity: Number(product.quantity) || 0,
      min_stock: Number(product.min_stock) || 0,
      cost_price: Number(product.cost_price) || 0,
      sale_price: Number(product.sale_price) || 0,
      supplier: product.supplier || '',
      is_active: Boolean(product.is_active),
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(initialForm);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form);
        toast.success('Produto atualizado com sucesso.');
      } else {
        await createProduct(form);
        toast.success('Produto criado com sucesso.');
      }

      closeModal();
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  }, [editingProduct, form, toast, closeModal]);

  const handleDelete = async (id: number | string, name: string) => {
    const confirmed = await confirm({
      title: 'Excluir produto',
      description: 'Esta ação remove o produto do cadastro.',
      body: `Tem certeza que deseja excluir "${name}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(id);
      toast.success('Produto excluído com sucesso.');
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Não foi possível excluir o produto.');
    }
  };

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const response = await uploadImage(file);
      setForm((current) => ({ ...current, photo: response.url }));
      toast.success('Imagem enviada com sucesso.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="app-loader" style={{ minHeight: '60vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando estoque...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiPackage />
            Catálogo
          </span>
          <h1>Estoque e visibilidade</h1>
          <p className="page-header__subtitle">
            {products.length} itens cadastrados, {visibleProducts} visíveis na loja e {lowStock} em
            alerta de estoque.
          </p>
        </div>

        <div className="page-header__actions">
          <button type="button" className="btn btn--primary" onClick={openNew}>
            <FiPlus />
            Novo produto
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="table-search">
          <FiSearch className="table-search__icon" />
          <input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th className="hide-mobile">Código</th>
                <th className="hide-mobile">Foto</th>
                <th>Produto</th>
                <th className="hide-mobile">Categoria</th>
                <th>Catálogo</th>
                <th>Estoque</th>
                <th>Venda</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const lowStockItem = Number(product.quantity) <= Number(product.min_stock);

                return (
                  <tr key={product.id}>
                    <td className="hide-mobile">
                      <span className="code-pill">{product.code}</span>
                    </td>
                    <td className="hide-mobile">
                      <div className="media-thumb" style={{ position: 'relative' }}>
                        {product.photo ? (
                          <AppImage
                            src={getImageUrl(product.photo)}
                            alt={product.name}
                            fill
                            sizes="40px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <FiImage style={{ color: 'var(--gray-400)' }} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{product.name}</div>
                      {product.supplier ? (
                        <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-xs)' }}>
                          {product.supplier}
                        </div>
                      ) : null}
                    </td>
                    <td className="hide-mobile">
                      <span className="badge badge--neutral">{product.category}</span>
                    </td>
                    <td>
                      <span className={`badge ${product.is_active ? 'badge--success' : 'badge--neutral'}`}>
                        {product.is_active ? 'Visível' : 'Oculto'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800 }}>{product.quantity}</div>
                      <div
                        style={{
                          color: lowStockItem ? 'var(--danger-500)' : 'var(--gray-500)',
                          fontSize: 'var(--font-xs)',
                        }}
                      >
                        Mínimo: {product.min_stock}
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--primary-600)' }}>
                      {formatCurrency(Number(product.sale_price))}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          aria-label={`Editar ${product.name}`}
                          onClick={() => openEdit(product)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          aria-label={`Excluir ${product.name}`}
                          onClick={() => handleDelete(product.id, product.name)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Editar produto' : 'Novo produto'}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingProduct ? 'Salvar' : 'Criar'}
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="product-code">
              Código
            </label>
            <input
              id="product-code"
              className="form-input"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="Ex.: TL-001"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-category">
              Categoria
            </label>
            <select
              id="product-category"
              className="form-select"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="product-name">
            Nome do produto
          </label>
          <input
            id="product-name"
            className="form-input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Nome do produto"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="product-description">
            Descrição
          </label>
          <textarea
            id="product-description"
            className="form-input"
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Descrição do produto"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Foto do produto</label>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--gray-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'var(--gray-50)',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {form.photo ? (
                <AppImage
                  src={getImageUrl(form.photo)}
                  alt="Prévia do produto"
                  fill
                  sizes="80px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <FiImage style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <label className="btn btn--secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <FiUpload />
                {uploading ? 'Enviando...' : 'Escolher imagem'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={handlePhotoUpload}
                />
              </label>

              <div style={{ marginTop: 'var(--space-2)' }}>
                <input
                  className="form-input"
                  value={form.photo}
                  onChange={(event) => setForm({ ...form, photo: event.target.value })}
                  placeholder="Ou cole a URL da imagem"
                  style={{ fontSize: 'var(--font-xs)', padding: '0.4rem 0.6rem' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="product-quantity">
              Quantidade em estoque
            </label>
            <input
              id="product-quantity"
              className="form-input"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(event) =>
                setForm({ ...form, quantity: Math.max(0, Number(event.target.value) || 0) })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-min-stock">
              Estoque mínimo
            </label>
            <input
              id="product-min-stock"
              className="form-input"
              type="number"
              min="0"
              value={form.min_stock}
              onChange={(event) =>
                setForm({ ...form, min_stock: Math.max(0, Number(event.target.value) || 0) })
              }
            />
          </div>
        </div>

        <div
          className="card"
          style={{
            marginBottom: 'var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
          }}
        >
          <input
            id="activeToggle"
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
          <label htmlFor="activeToggle" style={{ cursor: 'pointer', fontWeight: 700 }}>
            Visível no catálogo público
          </label>
          {!form.is_active ? (
            <span className="badge badge--neutral">Oculto</span>
          ) : Number(form.quantity) <= 0 ? (
            <span className="badge badge--warning">
              <FiAlertTriangle />
              Sem estoque para venda
            </span>
          ) : (
            <span className="badge badge--success">Pronto para venda</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="product-cost-price">
              Preço de custo (R$)
            </label>
            <input
              id="product-cost-price"
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={(event) =>
                setForm({ ...form, cost_price: Number(event.target.value) || 0 })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="product-sale-price">
              Preço de venda (R$)
            </label>
            <input
              id="product-sale-price"
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              value={form.sale_price}
              onChange={(event) =>
                setForm({ ...form, sale_price: Number(event.target.value) || 0 })
              }
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="product-supplier">
            Fornecedor
          </label>
          <input
            id="product-supplier"
            className="form-input"
            value={form.supplier}
            onChange={(event) => setForm({ ...form, supplier: event.target.value })}
            placeholder="Nome do fornecedor"
          />
        </div>
      </Modal>
    </div>
  );
}
