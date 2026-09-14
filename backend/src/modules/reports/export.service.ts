/**
 * Export service: CSV export of the current search filter.
 *
 * Includes driver name and plates. PII access is role-gated and audited by the
 * controller.
 */
import { Injectable } from '@nestjs/common';
import { SearchResultRow } from './reports.service';

/** CSV column headers. */
const HEADERS = [
  'confirmation_code',
  'tenant_id',
  'carrier_name',
  'status',
  'window_start',
  'window_end',
  'driver_name',
  'tractor_plate',
  'trailer_number',
  'arrived_at',
  'exited_at',
];

@Injectable()
export class ExportService {
  /**
   * Escape a CSV cell value.
   *
   * Args:
   *   value: The cell value.
   *
   * Returns:
   *   The escaped cell.
   */
  private cell(value: string | Date | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = value instanceof Date ? value.toISOString() : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Render search result rows as CSV.
   *
   * Args:
   *   rows: The search result rows.
   *
   * Returns:
   *   The CSV string with a header row.
   */
  toCsv(rows: SearchResultRow[]): string {
    const lines = [HEADERS.join(',')];
    for (const row of rows) {
      lines.push(
        [
          this.cell(row.confirmationCode),
          this.cell(row.tenantId),
          this.cell(row.carrierName),
          this.cell(row.status),
          this.cell(row.windowStart),
          this.cell(row.windowEnd),
          this.cell(row.driverName),
          this.cell(row.tractorPlate),
          this.cell(row.trailerNumber),
          this.cell(row.arrivedAt),
          this.cell(row.exitedAt),
        ].join(','),
      );
    }
    return lines.join('\n');
  }
}
