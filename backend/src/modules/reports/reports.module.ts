/**
 * Reports module: registers the reports, export, PDF, and dashboard services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Visit } from '../visits/visit.entity';
import { UnscheduledVisit } from '../visits/unscheduled-visit.entity';
import { DetentionPause } from '../visits/detention-pause.entity';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { PdfService } from './pdf.service';
import { DashboardService } from './dashboard.service';
import { ReportsController } from './reports.controller';
import { VisitsService } from '../visits/visits.service';
import { DetentionService } from '../visits/detention.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Visit, UnscheduledVisit, DetentionPause]),
  ],
  providers: [
    ReportsService,
    ExportService,
    PdfService,
    DashboardService,
    VisitsService,
    DetentionService,
  ],
  controllers: [ReportsController],
})
export class ReportsModule {}
