/**
 * Doors controller: door CRUD, CSV import, and service status.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { DoorsService } from './doors.service';
import { Door } from './door.entity';
import { CreateDoorDto } from './dto/create-door.dto';
import { ImportDoorsDto } from './dto/import-doors.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../organizations/membership.entity';

/** Request body for marking a door out of service. */
export class OutOfServiceDto {
  /** The reason the door is out of service. */
  @IsString()
  note!: string;
}

@Controller('v1')
export class DoorsController {
  constructor(private readonly doors: DoorsService) {}

  /**
   * Add a door to a site (site admin).
   *
   * Args:
   *   siteId: The owning site id.
   *   dto: The door attributes.
   *
   * Returns:
   *   The created door.
   */
  @Post('sites/:siteId/doors')
  @Roles(Role.SITE_ADMIN, Role.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('siteId') siteId: string,
    @Body() dto: CreateDoorDto,
  ): Promise<Door> {
    return this.doors.create(siteId, dto);
  }

  /**
   * Bulk-import doors into a site (site admin).
   *
   * Args:
   *   siteId: The owning site id.
   *   dto: The doors to import.
   *
   * Returns:
   *   The created doors and skipped-duplicate count.
   */
  @Post('sites/:siteId/doors/import')
  @Roles(Role.SITE_ADMIN, Role.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  import(
    @Param('siteId') siteId: string,
    @Body() dto: ImportDoorsDto,
  ): Promise<{ created: Door[]; skipped: number }> {
    return this.doors.import(siteId, dto.doors);
  }

  /**
   * List doors for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Doors ordered by number.
   */
  @Get('sites/:siteId/doors')
  list(@Param('siteId') siteId: string): Promise<Door[]> {
    return this.doors.listForSite(siteId);
  }

  /**
   * Mark a door out of service (site admin / coordinator).
   *
   * Args:
   *   id: The door id.
   *   dto: The out-of-service note.
   *
   * Returns:
   *   The updated door.
   */
  @Patch('doors/:id/out-of-service')
  @Roles(Role.SITE_ADMIN, Role.SITE_COORDINATOR, Role.PLATFORM_ADMIN)
  outOfService(
    @Param('id') id: string,
    @Body() dto: OutOfServiceDto,
  ): Promise<Door> {
    return this.doors.setOutOfService(id, dto.note);
  }

  /**
   * Return a door to service (site admin / coordinator).
   *
   * Args:
   *   id: The door id.
   *
   * Returns:
   *   The updated door.
   */
  @Patch('doors/:id/in-service')
  @Roles(Role.SITE_ADMIN, Role.SITE_COORDINATOR, Role.PLATFORM_ADMIN)
  inService(@Param('id') id: string): Promise<Door> {
    return this.doors.setInService(id);
  }
}
