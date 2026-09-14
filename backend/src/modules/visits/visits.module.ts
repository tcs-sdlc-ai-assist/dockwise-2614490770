/**
 * Visits module: registers visit, visit-event, and unscheduled-visit
 * persistence and the gate/dock/visit services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visit } from './visit.entity';
import { VisitEvent } from './visit-event.entity';
import { UnscheduledVisit } from './unscheduled-visit.entity';
import { Appointment } from '../appointments/appointment.entity';
import { VisitsService } from './visits.service';
import { GateService } from './gate.service';
import { DockService } from './dock.service';
import { VisitsController } from './visits.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visit, VisitEvent, UnscheduledVisit, Appointment]),
  ],
  providers: [VisitsService, GateService, DockService],
  controllers: [VisitsController],
  exports: [VisitsService, GateService, DockService, TypeOrmModule],
})
export class VisitsModule {}
