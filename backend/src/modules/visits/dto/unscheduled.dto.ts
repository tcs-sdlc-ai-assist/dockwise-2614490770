/**
 * DTO for creating an unscheduled visit.
 */
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UnscheduledReason } from '../unscheduled-visit.entity';

/** Request body for logging an unscheduled visit. */
export class UnscheduledDto {
  /** The site id. */
  @IsUUID()
  siteId!: string;

  /** The tenant organization id, when known. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  /** Whether the tenant is unknown (last resort; pages the coordinator). */
  @IsOptional()
  @IsBoolean()
  unknownTenant?: boolean;

  /** The carrier name. */
  @IsOptional()
  @IsString()
  carrierName?: string;

  /** The tractor plate. */
  @IsString()
  tractorPlate!: string;

  /** The trailer/container number. */
  @IsOptional()
  @IsString()
  trailerNumber?: string;

  /** The driver name. */
  @IsOptional()
  @IsString()
  driverName?: string;

  /** The required reason for the unscheduled visit. */
  @IsEnum(UnscheduledReason)
  reason!: UnscheduledReason;
}
