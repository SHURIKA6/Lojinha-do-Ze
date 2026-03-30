import { useEffect, useMemo, useState } from 'react';
import { getCatalog } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

export function useCatalog(initialCatalog = null) {
  const hasInitialCatalog = Boolean(initialCatalog?.categories);
  const [catalogData, setCatalogData] = useState(() => initialCatalog || { categories: [], total: 0 });
  const [categoryTabs, setCategoryTabs] = useState(() => {
    return Array.isArray(initialCatalog?.categories)
      ? initialCatalog.categories.map(c => ({ name: c.name, count: Array.isArray(c.products) ? c.products.length : 0 }))
      : [];
  });
  const [activeCategory, setActiveCategory] = useState(() => initialCatalog?.categories?.[0]?.name || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(() => !hasInitialCatalog);
  const [error, setError] = useState('');
  const toast = useToast();

  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setPage(1); // Reseta a página em caso de busca ou mudança de categoria
  }, [search, activeCategory]);

  useEffect(() => {
    let active = true;
    if (!hasInitialCatalog && page === 1) {
      setLoading(true);
    }

    const offset = (page - 1) * itemsPerPage;
    const timer = setTimeout(() => {
      getCatalog({ search, category: activeCategory, limit: itemsPerPage, offset })
        .then((data) => {
          if (!active) return;
          
          if (page === 1) {
            setCatalogData(data || { categories: [], total: 0 });
            if (!activeCategory && !search) {
              setCategoryTabs((data?.categories || []).map(c => ({ name: c.name, count: Array.isArray(c.products) ? c.products.length : 0 })));
            }
          } else {
            setCatalogData(prev => {
              const newCategories = [...(prev?.categories || [])];
              (data?.categories || []).forEach(cat => {
                const existing = newCategories.find(c => c.name === cat.name);
                if (existing) {
                  existing.products = [...existing.products, ...cat.products];
                } else {
                  newCategories.push(cat);
                }
              });
              return { ...prev, categories: newCategories, total: data.total };
            });
          }

          if (!activeCategory && data?.categories?.length > 0 && page === 1) {
            setActiveCategory(data.categories[0].name);
          }
        })
        .catch((err) => {
          console.error(err);
          const nextError = 'Não foi possível carregar o catálogo.';
          if (page === 1) {
            setError(nextError);
            toast.error(nextError, 'Erro no catálogo');
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, search ? 500 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [hasInitialCatalog, toast, search, activeCategory, page]);

  const hasMore = catalogData.total > (page * itemsPerPage);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const allProducts = useMemo(() => {
    const categories = Array.isArray(catalogData?.categories) ? catalogData.categories : [];
    return categories.flatMap((c) => Array.isArray(c?.products) ? c.products : []);
  }, [catalogData]);

  const filteredProducts = useMemo(() => {
    return Array.isArray(allProducts) ? allProducts : [];
  }, [allProducts]);

  return {
    catalogData,
    categoryTabs,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    filteredProducts,
    allProducts,
    loading,
    error,
    setError,
    hasMore,
    loadMore
  };
}
