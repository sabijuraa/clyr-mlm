import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * Custom hook for API calls with loading and error states
 */
export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, url, data = null, config = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api({
        method,
        url,
        data,
        ...config
      });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const get = useCallback((url, config) => request('get', url, null, config), [request]);
  const post = useCallback((url, data, config) => request('post', url, data, config), [request]);
  const put = useCallback((url, data, config) => request('put', url, data, config), [request]);
  const del = useCallback((url, config) => request('delete', url, null, config), [request]);

  return {
    isLoading,
    error,
    setError,
    get,
    post,
    put,
    del,
    request
  };
};

/**
 * Hook for fetching data on mount
 */
export const useFetch = (url, dependencies = []) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(url);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  // Fetch on mount and when dependencies change
  useState(() => {
    fetchData();
  }, dependencies);

  return { data, isLoading, error, refetch: fetchData };
};

export default useApi;