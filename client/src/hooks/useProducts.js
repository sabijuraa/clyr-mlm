import { useState, useEffect, useCallback } from 'react';
import { productsAPI } from '../services/api';

export const useProducts = (initialParams = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchProducts = useCallback(async (newParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const mergedParams = { ...params, ...newParams };
      const response = await productsAPI.getAll(mergedParams);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
      setParams(mergedParams);
    } catch (err) {
      setError(err.response?.data?.message || 'Produkte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    setParams
  };
};

export const useFeaturedProducts = (limit = 4) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await productsAPI.getFeatured(limit);
        setProducts(response.data.products);
      } catch (err) {
        setError(err.response?.data?.message || 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [limit]);

  return { products, loading, error };
};

export const useProduct = (slug) => {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const response = await productsAPI.getBySlug(slug);
        setProduct(response.data.product);
        setRelatedProducts(response.data.relatedProducts || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Produkt nicht gefunden');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [slug]);

  return { product, relatedProducts, loading, error };
};

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await productsAPI.getCategories();
        setCategories(response.data.categories);
      } catch (err) {
        setError(err.response?.data?.message || 'Kategorien konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { categories, loading, error };
};

export default useProducts;
