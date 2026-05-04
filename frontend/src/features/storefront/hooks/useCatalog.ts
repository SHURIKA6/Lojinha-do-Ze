/**
 * Hook: useCatalog
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCatalog, CatalogResponse } from '@/core/api/catalog';
import { useToast } from '@/components/ui/ToastProvider';
import { Product } from '@/types';

export interface CatalogCategory {
  name: string;
  products: Product[];
}

export interface CatalogData {
  categories: CatalogCategory[];
  total: number;
}

export interface CategoryTab {
  name: string;
  count: number;
}

export function useCatalog(initialCatalog: CatalogData | null = null) {
  const [activeCategory, setActiveCategory] = useState<string>(() => initialCatalog?.categories?.[0]?.name || '');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const itemsPerPage = 50;
  
  const toast = useToast();

  const { data: catalogDataRaw, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['catalog', { search, activeCategory, sortBy, minPrice, maxPrice, page }],
    queryFn: ({ signal }) => getCatalog({
      search,
      category: activeCategory,
      sortBy,
      minPrice,
      maxPrice,
      limit: itemsPerPage * page,
      offset: 0,
      signal
    }),
    initialData: (page === 1 && initialCatalog) ? initialCatalog : undefined,
  });

  const catalogData = useMemo(() => catalogDataRaw || { categories: [], total: 0 }, [catalogDataRaw]);

  const [categoryTabs, setCategoryTabs] = useState<CategoryTab[]>(() => {
    return Array.isArray(initialCatalog?.categories)
      ? initialCatalog.categories.map(c => ({ name: c.name, count: Array.isArray(c.products) ? c.products.length : 0 }))
      : [];
  });

  useEffect(() => {
    if (catalogData && catalogData.categories.length > 0 && !activeCategory && !search) {
      setCategoryTabs(catalogData.categories.map(c => ({
        name: c.name,
        count: Array.isArray(c.products) ? c.products.length : 0
      })));
    }
  }, [catalogData, activeCategory, search]);

  useEffect(() => {
    if (!activeCategory && catalogData && catalogData.categories.length > 0) {
      setActiveCategory(catalogData.categories[0].name);
    }
  }, [catalogData, activeCategory]);

  useEffect(() => {
    setPage(1);
  }, [search, activeCategory, sortBy, minPrice, maxPrice]);

  const hasMore = (catalogData?.total || 0) > (page * itemsPerPage);

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
    sortBy,
    setSortBy,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    filteredProducts,
    allProducts,
    loading,
    error: queryError ? 'Não foi possível carregar o catálogo.' : '',
    setError: () => {},
    hasMore,
    loadMore
  };
}