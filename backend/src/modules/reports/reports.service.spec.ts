/**
 * Unit tests for ReportsService search, ExportService CSV, PdfService, and
 * DashboardService metrics.
 */
import { DataSource, Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { PdfService } from './pdf.service';
import { DashboardService } from './dashboard.service';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus, ActivityType } from '../appointments/appointment.enums';
import { Visit, VisitStatus } from '../visits/visit.entity';
import {
  UnscheduledVisit,
  UnscheduledReason,
  UnscheduledStatus,
} from '../visits/unscheduled-visit.entity';
import { DetentionPause } from '../visits/detention-pause.entity';
import { DetentionService } from '../visits/detention.service';
import { Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';
import { makePrincipal } from '../../test-utils/make-principal';

describe('Reports', () => {
  let dataSource: DataSource;
  let appointments: Repository<Appointment>;
  let visits: Repository<Visit>;
  let unscheduled: Repository<UnscheduledVisit>;
  let pauses: Repository<DetentionPause>;
  let reports: ReportsService;
  let exporter: ExportService;
  let pdf: PdfService;
  let dashboard: DashboardService;
  let detention: DetentionService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    appointments = dataSource.getRepository(Appointment);
    visits = dataSource.getRepository(Visit);
    unscheduled = dataSource.getRepository(UnscheduledVisit);
    pauses = dataSource.getRepository(DetentionPause);
    reports = new ReportsService(appointments, visits);
    exporter = new ExportService();
    pdf = new PdfService();
    dashboard = new DashboardService(appointments, visits, unscheduled);
    detention = new DetentionService(visits, pauses, appointments);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await pauses.clear();
    await unscheduled.clear();
    await visits.clear();
    await appointments.clear();

    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await appointments.save([
      appointments.create({
        confirmationCode: 'RPT11111',
        siteId: 'site-1',
        tenantId: 'tenant-a',
        carrierId: 'carrier-1',
        carrierName: 'Northstar',
        activity: ActivityType.LIVE_UNLOAD,
        windowStart: recent,
        windowEnd: new Date(recent.getTime() + 3600000),
        status: AppointmentStatus.COMPLETE,
        referenceText: 'PO 88421',
      }),
      appointments.create({
        confirmationCode: 'RPT22222',
        siteId: 'site-1',
        tenantId: 'tenant-b',
        carrierId: 'carrier-2',
        activity: ActivityType.LIVE_LOAD,
        windowStart: recent,
        windowEnd: new Date(recent.getTime() + 3600000),
        status: AppointmentStatus.CONFIRMED,
        referenceText: 'PO 99999',
      }),
    ]);
  });

  it('searches by PO within 90 days', async () => {
    const rows = await reports.search(
      { siteId: 'site-1', po: '88421' },
      makePrincipal(Role.SITE_ADMIN),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].confirmationCode).toBe('RPT11111');
  });

  it('scopes a tenant to only its own rows', async () => {
    const rows = await reports.search(
      { siteId: 'site-1' },
      makePrincipal(Role.TENANT_ADMIN, 'tenant', 'tenant-a'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tenantId).toBe('tenant-a');
  });

  it('scopes a carrier to only its loads', async () => {
    const rows = await reports.search(
      { siteId: 'site-1' },
      makePrincipal(Role.CARRIER_DISPATCHER, 'carrier', 'carrier-2'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].confirmationCode).toBe('RPT22222');
  });

  it('excludes appointments older than 90 days', async () => {
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await appointments.save(
      appointments.create({
        confirmationCode: 'OLD12345',
        siteId: 'site-1',
        tenantId: 'tenant-a',
        activity: ActivityType.DROP,
        windowStart: old,
        windowEnd: new Date(old.getTime() + 3600000),
        status: AppointmentStatus.COMPLETE,
      }),
    );
    const rows = await reports.search(
      { siteId: 'site-1' },
      makePrincipal(Role.SITE_ADMIN),
    );
    expect(rows.some((r) => r.confirmationCode === 'OLD12345')).toBe(false);
  });

  it('exports search results as CSV with driver name and plates', async () => {
    const appt = await appointments.findOne({
      where: { confirmationCode: 'RPT11111' },
    });
    await visits.save(
      visits.create({
        siteId: 'site-1',
        appointmentId: appt!.id,
        tenantId: 'tenant-a',
        driverName: 'Sam Driver',
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL456',
        status: VisitStatus.EXITED,
        arrivedAt: new Date(),
        exitedAt: new Date(),
      }),
    );
    const rows = await reports.search(
      { siteId: 'site-1', po: '88421' },
      makePrincipal(Role.SITE_ADMIN),
    );
    const csv = exporter.toCsv(rows);
    expect(csv).toContain('confirmation_code');
    expect(csv).toContain('Sam Driver');
    expect(csv).toContain('ABC123');
    expect(csv).toContain('RPT11111');
  });

  it('builds a one-visit PDF with the disclaimer', async () => {
    const appt = await appointments.findOne({
      where: { confirmationCode: 'RPT11111' },
    });
    const visit = await visits.save(
      visits.create({
        siteId: 'site-1',
        appointmentId: appt!.id,
        tenantId: 'tenant-a',
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL456',
        status: VisitStatus.EXITED,
        arrivedAt: new Date('2025-06-02T12:00:00Z'),
        loadCompleteAt: new Date('2025-06-02T16:00:00Z'),
        exitedAt: new Date('2025-06-02T16:30:00Z'),
      }),
    );
    const estimate = await detention.estimate(visit.id);
    const buffer = pdf.buildVisitPdf(visit, estimate, 'RPT11111');
    const text = buffer.toString('latin1');
    expect(text).toContain('%PDF-1.4');
    expect(text).toContain('RPT11111');
    expect(text).toContain('Not an invoice. For discussion only.');
  });

  it('computes dashboard metrics', async () => {
    const appt = await appointments.findOne({
      where: { confirmationCode: 'RPT11111' },
    });
    await visits.save(
      visits.create({
        siteId: 'site-1',
        appointmentId: appt!.id,
        tenantId: 'tenant-a',
        tractorPlate: 'ABC123',
        trailerNumber: 'TRL456',
        status: VisitStatus.EXITED,
        arrivedAt: appt!.windowStart,
        loadCompleteAt: new Date(appt!.windowStart.getTime() + 90 * 60000),
      }),
    );
    await unscheduled.save(
      unscheduled.create({
        siteId: 'site-1',
        tenantId: 'tenant-a',
        tractorPlate: 'XYZ789',
        reason: UnscheduledReason.HOT_LOAD,
        status: UnscheduledStatus.TURNED_AWAY,
        arrivedAt: new Date(),
      }),
    );
    const metrics = await dashboard.metrics(
      'site-1',
      makePrincipal(Role.SITE_ADMIN),
    );
    expect(metrics.byStatus30d[AppointmentStatus.COMPLETE]).toBe(1);
    expect(metrics.onTimePercent).toBe(100);
    expect(metrics.avgDwellMinutes).toBe(90);
    expect(metrics.unscheduledCount).toBe(1);
    expect(metrics.turnAwayCount).toBe(1);
  });
});
