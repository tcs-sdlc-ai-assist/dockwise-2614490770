/**
 * DTO for gate check-in.
 */
import { IsOptional, IsString } from 'class-validator';

/** Request body for checking a vehicle in at the gate. */
export class CheckInDto {
  /** The driver name. */
  @IsString()
  driverName!: string;

  /** The tractor plate (required even if absent from the booking). */
  @IsString()
  tractorPlate!: string;

  /** The trailer/container number (required even if absent from the booking). */
  @IsString()
  trailerNumber!: string;

  /** Optional gate note. */
  @IsOptional()
  @IsString()
  note?: string;
}
