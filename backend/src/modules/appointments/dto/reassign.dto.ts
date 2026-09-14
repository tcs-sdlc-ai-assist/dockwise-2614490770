/**
 * DTO for declining and reassigning appointments.
 */
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ReassignmentReason } from '../reassignment.entity';

/** Request body for declining an appointment. */
export class DeclineDto {
  /** The reason for declining. */
  @IsString()
  reason!: string;
}

/** Request body for reassigning an appointment to a different door. */
export class ReassignDto {
  /** The target door id. */
  @IsUUID()
  toDoorId!: string;

  /** The required reason for the reassignment. */
  @IsEnum(ReassignmentReason)
  reason!: ReassignmentReason;
}
