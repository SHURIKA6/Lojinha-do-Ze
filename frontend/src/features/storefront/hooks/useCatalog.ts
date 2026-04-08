import { useEffect, useMemo, useState } from 'react';
import { getCatalog } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { Product } from '@/types';

interface CatalogCategory {
  name: string;
  products: Product[];
}

interface CatalogCategorySummary {
  name: string;
  count: number;
}

interface CatalogData {
  categories: CatalogCategory[];
  total: number;
  availableCategories?: CatalogCategorySummary[];
}

export interface CategoryTab {
  name: string;
  count: number;
}

function mapCategoryTabs(data: CatalogData | null): CategoryTab[] {
  if (Array.isArray(data?.availableCategories) && data.availableCategories.length > 0) {
    return data.availableCategories.map((category) => ({
      name: category.name,
      count: category.count,
    }));
  }

  return Array.isArray(data?.categories)
    ? data.categories.map((category: CatalogCategory) => ({
        name: category.name,
        count: Array.isArray(category.products) ? category.products.length : 0,
      }))
    : [];
}

export function useCatalog(initialCatalog: CatalogData | null = null) {
  const hasInitialCatalog = Boolean(initialCatalog?.categories);
  const [catalogData, setCatalogData] = useState<CatalogData>(() => initialCatalog || { categories: [], total: 0 });
  const [categoryTabs, setCategoryTabs] = useState<CategoryTab[]>(() => mapCategoryTabs(initialCatalog));
  const [activeCategory, setActiveCategory] = useState('');
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
        .then((data: CatalogData) => {
          if (!active) return;
          
          if (page === 1) {
            setCatalogData(data || { categories: [], total: 0 });
            setCategoryTabs(mapCategoryTabs(data || null));
          } else {
            setCatalogData((prev: CatalogData) => {
              const currentCategories = prev?.categories || [];
              const incomingCategories = data?.categories || [];

              const categoryMap = new Map<string, CatalogCategory>(currentCategories.map((c: CatalogCategory) => [c.name, c]));

              incomingCategories.forEach(cat => {
                const existing = categoryMap.get(cat.name);
                if (existing) {
                  categoryMap.set(cat.name, {
                    ...existing,
                    products: [...existing.products, ...cat.products]
                  });
                } else {
                  categoryMap.set(cat.name, cat);
                }
              });

              return {
                ...prev,
                categories: Array.from(categoryMap.values()),
                total: data.total
              };
            });
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
      setPage((prev: number) => prev + 1);
    }
  };

  const allProducts = useMemo(() => {
    const categories = Array.isArray(catalogData?.categories) ? catalogData.categories : [];
    return categories
      .flatMap((c: CatalogCategory) => (Array.isArray(c?.products) ? c.products : []))
      .sort((left: Product, right: Product) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }));
  }, [catalogData]);

  const filteredProducts = useMemo(() => {
    return Array.isArray(allProducts) ? allProducts : [];
  }, [allProducts]);

  const totalProductsCount = useMemo(() => {
    if (categoryTabs.length > 0) {
      return categoryTabs.reduce((sum: number, category: CategoryTab) => sum + category.count, 0);
    }

    return catalogData.total || 0;
  }, [categoryTabs, catalogData.total]);

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
    totalProductsCount,
    hasMore,
    loadMore
  };
}
