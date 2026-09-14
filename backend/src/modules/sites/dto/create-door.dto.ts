/**
 * DTO for creating a single door.
 */
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DoorType } from '../door.entity';

/** Request body for creating a door. */
export class CreateDoorDto {
  /** Door number/label. */
  @IsString()
  number!: string;

  /** Physical door type. */
  @IsEnum(DoorType)
  type!: DoorType;

  /** Door group: "pool" or "leased:{tenant_id}". */
  @IsOptional()
  @IsString()
  group?: string;

  /** Whether the door has reefer power. */
  @IsOptional()
  @IsBoolean()
  reeferPower?: boolean;

  /** Whether the door supports containers. */
  @IsOptional()
  @IsBoolean()
  containerSupport?: boolean;

  /** Maximum trailer length in feet. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTrailerLengthFt?: number;
}
