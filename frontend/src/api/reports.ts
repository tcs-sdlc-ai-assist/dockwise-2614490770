/**
 * Reports API calls for the Dockwise frontend.
 */
import { apiClient } from './client';

/** A search result row. */
export interface SearchResultRow {
  appointmentId: string;
  confirmationCode: string;
  tenantId: string;
  carrierId: string | null;
  carrierName: string | null;
  status: string;
  windowStart: string;
  windowEnd: string;
  tractorPlate: string | null;
  trailerNumber: string | null;
  driverName: string | null;
  visitId: string | null;
  arrivedAt: string | null;
  exitedAt: string | null;
}

/** The dashboard metrics. */
export interface DashboardMetrics {
  siteId: string;
  byStatus7d: Record<string, number>;
  byStatus30d: Record<string, number>;
  onTimePercent: number | null;
  avgDwellMinutes: number | null;
  unscheduledCount: number;
  turnAwayCount: number;
  lateCancelCount: number;
  noShowCount: number;
}

/** Search filters. */
export interface SearchFilters {
  siteId: string;
  plate?: string;
  po?: string;
  confirmationCode?: string;
  status?: string;
}

/** Search the last 90 days. */
export async function searchReports(
  filters: SearchFilters,
): Promise<SearchResultRow[]> {
  const res = await apiClient.get<SearchResultRow[]>('/api/v1/reports/search', {
    params: filters,
  });
  return res.data;
}

/** Fetch the dashboard metrics for a site. */
export async function getDashboard(siteId: string): Promise<DashboardMetrics> {
  const res = await apiClient.get<DashboardMetrics>('/api/v1/reports/dashboard', {
    params: { siteId },
  });
  return res.data;
}

/** Build the CSV export URL for the current filter. */
export function exportCsvUrl(filters: SearchFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return `/api/v1/reports/export.csv?${params.toString()}`;
}
