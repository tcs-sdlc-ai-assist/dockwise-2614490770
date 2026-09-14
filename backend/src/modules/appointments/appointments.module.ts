/**
 * Appointments module: registers appointment persistence, availability, and
 * booking services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity';
import { Door } from '../sites/door.entity';
import { Site } from '../sites/site.entity';
import { AvailabilityService } from './availability.service';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Door, Site])],
  providers: [AvailabilityService, AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService, AvailabilityService, TypeOrmModule],
})
export class AppointmentsModule {}
