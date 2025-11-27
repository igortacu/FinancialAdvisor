import { useState, useEffect, useCallback } from 'react';
import { getForecast, ForecastResponse } from '@/lib/mlApi';

export function useForecast(userId: string | undefined, n: number = 6) {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getForecast(userId, n);
      setData(res);
    } catch (err) {
      console.warn("Forecast fetch error:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast');
    } finally {
      setLoading(false);
    }
  }, [userId, n]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { data, loading, error, refetch: fetchForecast };
}
