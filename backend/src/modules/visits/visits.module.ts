/**
 * Visits module: registers visit, visit-event, and unscheduled-visit
 * persistence and the gate/dock/visit services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visit } from './visit.entity';
import { VisitEvent } from './visit-event.entity';
import { UnscheduledVisit } from './unscheduled-visit.entity';
import { DetentionPause } from './detention-pause.entity';
import { Appointment } from '../appointments/appointment.entity';
import { VisitsService } from './visits.service';
import { GateService } from './gate.service';
import { DockService } from './dock.service';
import { DetentionService } from './detention.service';
import { VisitsController } from './visits.controller';
import { DetentionController } from './detention.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Visit,
      VisitEvent,
      UnscheduledVisit,
      DetentionPause,
      Appointment,
    ]),
  ],
  providers: [VisitsService, GateService, DockService, DetentionService],
  controllers: [VisitsController, DetentionController],
  exports: [
    VisitsService,
    GateService,
    DockService,
    DetentionService,
    TypeOrmModule,
  ],
})
export class VisitsModule {}
