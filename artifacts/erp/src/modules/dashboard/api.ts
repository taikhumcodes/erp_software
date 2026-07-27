import { useState, useEffect } from 'react';
import { useDashboardStore } from './store';

function getAuthHeaders() {
  const token = localStorage.getItem('erp_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export function useDashboardKPIs(startDate: Date, endDate: Date) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/dashboard/kpis?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch KPIs');
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [startDate, endDate]);

  return { data, isLoading, error };
}

export function useDashboardInventory(startDate: Date, endDate: Date) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/dashboard/inventory?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch Inventory Intelligence');
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [startDate, endDate]);

  return { data, isLoading, error };
}

export function useDashboardCharts(startDate: Date, endDate: Date) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/dashboard/charts?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch Charts');
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [startDate, endDate]);

  return { data, isLoading, error };
}

export function useDashboardOperations(startDate: Date, endDate: Date) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/dashboard/operations?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch Operations');
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [startDate, endDate]);

  return { data, isLoading, error };
}
