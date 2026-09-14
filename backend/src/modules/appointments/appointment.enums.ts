/**
 * Appointment domain enums: lifecycle status, direction/activity, and vehicle
 * type.
 */

/** Lifecycle status of an appointment. */
export enum AppointmentStatus {
  DRAFT = 'draft',
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
  COUNTERED = 'countered',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  ARRIVED = 'arrived',
  AT_DOOR = 'at_door',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  EXITED = 'exited',
  TURNED_AWAY = 'turned_away',
}

/** Direction/activity of the visit. */
export enum ActivityType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  EMPTY = 'empty',
  LIVE_UNLOAD = 'live unload',
  LIVE_LOAD = 'live load',
  DROP = 'drop',
  HOOK = 'hook',
}

/** Vehicle type for door-compatibility checks. */
export enum VehicleType {
  TRACTOR_TRAILER = 'tractor_trailer',
  BOX_TRUCK = 'box_truck',
  CONTAINER = 'container',
  REEFER = 'reefer',
  FLATBED = 'flatbed',
  VAN = 'van',
}
