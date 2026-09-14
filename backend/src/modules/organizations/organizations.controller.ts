/**
 * Organizations controller: organization listing and creation.
 */
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsEnum, IsEmail, IsOptional, IsString } from 'class-validator';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationType } from './organization.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from './membership.entity';

/** Request body for creating an organization. */
export class CreateOrganizationDto {
  /** Organization name. */
  @IsString()
  name!: string;

  /** Organization category. */
  @IsEnum(OrganizationType)
  type!: OrganizationType;

  /** Optional primary contact email. */
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  /**
   * List organizations, optionally filtered by type.
   *
   * Args:
   *   type: Optional category filter.
   *
   * Returns:
   *   Matching organizations.
   */
  @Get()
  list(@Query('type') type?: OrganizationType): Promise<Organization[]> {
    return this.organizations.list(type);
  }

  /**
   * Create an organization (platform admin only).
   *
   * Args:
   *   dto: The organization attributes.
   *
   * Returns:
   *   The created organization.
   */
  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrganizationDto): Promise<Organization> {
    return this.organizations.create(dto.name, dto.type, dto.contactEmail);
  }
}
