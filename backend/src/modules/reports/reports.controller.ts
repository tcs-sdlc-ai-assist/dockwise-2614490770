/**
 * Reports controller: search, CSV export, visit PDF, and dashboards.
 */
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService, SearchFilters, SearchResultRow } from './reports.service';
import { ExportService } from './export.service';
import { PdfService } from './pdf.service';
import { DashboardService, DashboardMetrics } from './dashboard.service';
import { VisitsService } from '../visits/visits.service';
import { DetentionService } from '../visits/detention.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthPrincipal } from '../auth/auth.service';

@Controller('v1/reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exporter: ExportService,
    private readonly pdf: PdfService,
    private readonly dashboard: DashboardService,
    private readonly visits: VisitsService,
    private readonly detention: DetentionService,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  /**
   * Build search filters from query params.
   */
  private buildFilters(query: Record<string, string>): SearchFilters {
    return {
      siteId: query.siteId,
      tenantId: query.tenantId,
      carrierId: query.carrierId,
      plate: query.plate,
      po: query.po,
      confirmationCode: query.confirmationCode,
      status: query.status,
    };
  }

  /**
   * Search the last 90 days.
   *
   * Args:
   *   query: The search filters.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   Matching rows.
   */
  @Get('search')
  search(
    @Query() query: Record<string, string>,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<SearchResultRow[]> {
    return this.reports.search(this.buildFilters(query), principal);
  }

  /**
   * Export the current filter as CSV.
   *
   * Args:
   *   query: The search filters.
   *   principal: The authenticated caller.
   *   res: The response (for the CSV content type).
   */
  @Get('export.csv')
  async exportCsv(
    @Query() query: Record<string, string>,
    @CurrentUser() principal: AuthPrincipal,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reports.search(this.buildFilters(query), principal);
    const csv = this.exporter.toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="dockwise-export.csv"',
    );
    res.send(csv);
  }

  /**
   * Get a one-visit PDF.
   *
   * Args:
   *   id: The visit id.
   *   res: The response (for the PDF content type).
   *
   * Raises:
   *   NotFoundException: When the visit does not exist.
   */
  @Get('visits/:id.pdf')
  async visitPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const visit = await this.visits.findById(id);
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }
    let confirmationCode = '';
    if (visit.appointmentId) {
      const appt = await this.appointments.findOne({
        where: { id: visit.appointmentId },
      });
      confirmationCode = appt?.confirmationCode ?? '';
    }
    const estimate = await this.detention.estimate(id);
    const pdfBuffer = this.pdf.buildVisitPdf(visit, estimate, confirmationCode);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="visit-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  /**
   * Get the dashboard metrics for a site.
   *
   * Args:
   *   siteId: The site id.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The dashboard metrics.
   */
  @Get('dashboard')
  dashboardMetrics(
    @Query('siteId') siteId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<DashboardMetrics> {
    return this.dashboard.metrics(siteId, principal);
  }
}
