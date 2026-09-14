/**
 * DTO for creating an appointment.
 */
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ActivityType, VehicleType } from '../appointment.enums';

/** Request body for creating an appointment. */
export class CreateAppointmentDto {
  /** The site id. */
  @IsUUID()
  siteId!: string;

  /** The tenant organization id (must match the caller's tenant). */
  @IsUUID()
  tenantId!: string;

  /** The carrier organization id, when linked. */
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  /** Free-text carrier name when no carrier account is linked. */
  @IsOptional()
  @IsString()
  carrierName?: string;

  /** The requested door id (optional at request time). */
  @IsOptional()
  @IsUUID()
  doorId?: string;

  /** Direction/activity. */
  @IsEnum(ActivityType)
  activity!: ActivityType;

  /** Window start (ISO 8601, UTC). */
  @IsDateString()
  windowStart!: string;

  /** Window end (ISO 8601, UTC). */
  @IsDateString()
  windowEnd!: string;

  /** Vehicle type. */
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  /** Optional PO/BOL/container/seal reference text. */
  @IsOptional()
  @IsString()
  referenceText?: string;

  /** Hazmat flag. */
  @IsOptional()
  @IsBoolean()
  hazmat?: boolean;

  /** After-hours flag. */
  @IsOptional()
  @IsBoolean()
  afterHours?: boolean;

  /** Drop-trailer flag. */
  @IsOptional()
  @IsBoolean()
  dropTrailer?: boolean;

  /** Gate-visible note. */
  @IsOptional()
  @IsString()
  gateNote?: string;

  /** Internal-only note. */
  @IsOptional()
  @IsString()
  internalNote?: string;

  /** Whether to save as a draft (unsubmitted) instead of submitting. */
  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;
}
