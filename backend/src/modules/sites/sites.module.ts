/**
 * Sites module: registers site, door, calendar, and device persistence and
 * services.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './site.entity';
import { Door } from './door.entity';
import { OperatingCalendarEntry } from './operating-calendar.entity';
import { Device } from './device.entity';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { DoorsService } from './doors.service';
import { DoorsController } from './doors.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Site, Door, OperatingCalendarEntry, Device]),
  ],
  providers: [SitesService, DoorsService],
  controllers: [SitesController, DoorsController],
  exports: [SitesService, DoorsService, TypeOrmModule],
})
export class SitesModule {}
