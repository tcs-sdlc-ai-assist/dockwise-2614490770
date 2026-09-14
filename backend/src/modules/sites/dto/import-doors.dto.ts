/**
 * DTO for importing doors from CSV rows.
 */
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateDoorDto } from './create-door.dto';

/** Request body for bulk-importing doors. */
export class ImportDoorsDto {
  /** The doors to import. */
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateDoorDto)
  doors!: CreateDoorDto[];
}
