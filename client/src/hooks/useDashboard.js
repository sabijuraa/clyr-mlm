import { useState, useEffect, useCallback } from 'react';
import { partnerAPI, adminAPI } from '../services/api';

export const usePartnerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partnerAPI.getDashboard();
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Dashboard konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refresh: fetchDashboard };
};

export const useAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getDashboard();
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Dashboard konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refresh: fetchDashboard };
};

export const useTeam = (params = {}) => {
  const [team, setTeam] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeam = useCallback(async (newParams = {}) => {
    setLoading(true);
    try {
      const response = await partnerAPI.getTeam({ ...params, ...newParams });
      setTeam(response.data.team);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Team konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { team, pagination, loading, error, fetchTeam };
};

export const useWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partnerAPI.getWallet();
      setWallet(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Wallet konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPayout = useCallback(async (amount = null) => {
    try {
      const response = await partnerAPI.requestPayout(amount);
      await fetchWallet();
      return { success: true, data: response.data };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Auszahlung fehlgeschlagen' 
      };
    }
  }, [fetchWallet]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return { wallet, loading, error, refresh: fetchWallet, requestPayout };
};

export const useRankProgress = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await partnerAPI.getRankProgress();
        setProgress(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Rang-Fortschritt konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { progress, loading, error };
};

export default usePartnerDashboard;
