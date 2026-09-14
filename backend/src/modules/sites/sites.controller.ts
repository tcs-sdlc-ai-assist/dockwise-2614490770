/**
 * Sites controller: site creation, listing, and lifecycle.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { Site } from './site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../organizations/membership.entity';
import { AuthPrincipal } from '../auth/auth.service';

@Controller('v1/sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  /**
   * Create a site (platform admin or site admin).
   *
   * Args:
   *   dto: The site attributes.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The created site.
   */
  @Post()
  @Roles(Role.PLATFORM_ADMIN, Role.SITE_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateSiteDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Site> {
    return this.sites.create(dto, principal);
  }

  /**
   * List sites visible to the caller.
   *
   * Args:
   *   principal: The authenticated caller.
   *
   * Returns:
   *   Sites scoped to the caller.
   */
  @Get()
  list(@CurrentUser() principal: AuthPrincipal): Promise<Site[]> {
    return this.sites.listForPrincipal(principal);
  }

  /**
   * Get a site by id.
   *
   * Args:
   *   id: The site id.
   *
   * Returns:
   *   The site.
   */
  @Get(':id')
  get(@Param('id') id: string): Promise<Site> {
    return this.sites.findById(id);
  }

  /**
   * Transition a site from shadow to live (site admin).
   *
   * Args:
   *   id: The site id.
   *
   * Returns:
   *   The updated site.
   */
  @Post(':id/go-live')
  @Roles(Role.SITE_ADMIN, Role.PLATFORM_ADMIN)
  goLive(@Param('id') id: string): Promise<Site> {
    return this.sites.goLive(id);
  }
}
