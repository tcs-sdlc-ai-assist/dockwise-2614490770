/**
 * Appointments module: registers appointment persistence, availability, and
 * booking services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity';
import { Reassignment } from './reassignment.entity';
import { Door } from '../sites/door.entity';
import { Site } from '../sites/site.entity';
import { AvailabilityService } from './availability.service';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Reassignment, Door, Site])],
  providers: [AvailabilityService, AppointmentsService, QueueService, BoardService],
  controllers: [AppointmentsController, QueueController, BoardController],
  exports: [
    AppointmentsService,
    AvailabilityService,
    QueueService,
    BoardService,
    TypeOrmModule,
  ],
})
export class AppointmentsModule {}
