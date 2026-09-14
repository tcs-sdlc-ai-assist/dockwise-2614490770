/**
 * DTO for creating a site.
 */
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

/** Request body for creating a site. */
export class CreateSiteDto {
  /** Site name. */
  @IsString()
  name!: string;

  /** Street address. */
  @IsString()
  address!: string;

  /** IANA timezone (e.g. "America/New_York"). */
  @IsString()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+/, {
    message: 'timezone must be an IANA name such as America/New_York',
  })
  timezone!: string;

  /** Optional yard holding-spot capacity. */
  @IsOptional()
  @IsInt()
  @Min(0)
  yardCapacity?: number;

  /** Optional minimum booking notice in minutes. */
  @IsOptional()
  @IsInt()
  @Min(0)
  minBookingNoticeMinutes?: number;

  /** Optional maximum days ahead. */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDaysAhead?: number;

  /** Optional per-door buffer in minutes. */
  @IsOptional()
  @IsInt()
  @Min(0)
  doorBufferMinutes?: number;
}
