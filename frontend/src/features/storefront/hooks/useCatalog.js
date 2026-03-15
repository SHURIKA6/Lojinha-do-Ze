import { useEffect, useMemo, useState } from 'react';
import { getCatalog } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

export function useCatalog(initialCatalog = null) {
  const hasInitialCatalog = Boolean(initialCatalog?.categories);
  const [catalogData, setCatalogData] = useState(() => initialCatalog || { categories: [], total: 0 });
  const [activeCategory, setActiveCategory] = useState(() => initialCatalog?.categories?.[0]?.name || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(() => !hasInitialCatalog);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    let active = true;
    if (!hasInitialCatalog) {
      setLoading(true);
    }

    getCatalog()
      .then((data) => {
        if (!active) return;
        setCatalogData(data || { categories: [], total: 0 });
        setActiveCategory((prev) => {
          const categories = data?.categories || [];
          if (prev && categories.some((c) => c.name === prev)) return prev;
          return categories[0]?.name || '';
        });
      })
      .catch((err) => {
        console.error(err);
        const nextError = 'Não foi possível carregar o catálogo. Verifique sua conexão.';
        if (!hasInitialCatalog) {
          setError(nextError);
          toast.error(nextError, 'Catálogo indisponível');
        }
      })
      .finally(() => {
        if (active && !hasInitialCatalog) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hasInitialCatalog, toast]);

  const allProducts = useMemo(
    () => catalogData.categories.flatMap((c) => c.products),
    [catalogData]
  );

  const filteredProducts = useMemo(() => {
    if (search) {
      return allProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    const category = catalogData.categories.find((c) => c.name === activeCategory);
    return category ? category.products : allProducts;
  }, [activeCategory, allProducts, catalogData, search]);

  return {
    catalogData,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    filteredProducts,
    allProducts,
    loading,
    error,
    setError
  };
}
