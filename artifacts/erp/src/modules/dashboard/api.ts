import { useState, useEffect } from 'react';

function getAuthHeaders() {
  const token = localStorage.getItem('erp_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function useDashboardFetch<T>(endpoint: string, startDate?: Date, endDate?: Date) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    let url = `/api/dashboard/${endpoint}`;
    if (startDate && endDate) {
      url += `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    }

    fetch(url, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
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
  }, [endpoint, startDate?.toISOString(), endDate?.toISOString()]);

  return { data, isLoading, error };
}

export function useDashboardKPIs(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('kpis', startDate, endDate);
}

export function useDashboardInventory(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('inventory', startDate, endDate);
}

export function useDashboardFinancial(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('financial', startDate, endDate);
}

export function useDashboardCustomers(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('customers', startDate, endDate);
}

export function useDashboardSuppliers(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('suppliers', startDate, endDate);
}

export function useDashboardSales(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('sales', startDate, endDate);
}

export function useDashboardOperations(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('operations', startDate, endDate);
}

export function useDashboardHealth(startDate: Date, endDate: Date) {
  return useDashboardFetch<any>('health', startDate, endDate);
}

export function useDashboardCenters() {
  return useDashboardFetch<any>('centers');
}
