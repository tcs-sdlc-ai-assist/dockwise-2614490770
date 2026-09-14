/**
 * DTO for querying availability.
 */
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../appointment.enums';

/** Query params for the availability endpoint. */
export class QueryAvailabilityDto {
  /** The site id. */
  @IsUUID()
  siteId!: string;

  /** The day to search (ISO 8601 date, UTC). */
  @IsDateString()
  day!: string;

  /** The appointment duration in minutes. */
  @IsInt()
  @Type(() => Number)
  durationMinutes!: number;

  /** The vehicle type, when filtering by compatibility. */
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}
