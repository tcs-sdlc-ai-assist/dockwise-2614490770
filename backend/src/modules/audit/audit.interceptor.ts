/**
 * Audit interceptor: records significant write actions to the audit log.
 *
 * Applied to mutating endpoints to capture the acting user, any impersonation
 * marker, and the entity affected. Reads the route's audit metadata.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AuthPrincipal } from '../auth/auth.service';

/** Metadata key for the audit action descriptor. */
export const AUDIT_KEY = 'auditAction';

/** Descriptor for an audited action. */
export interface AuditMeta {
  action: string;
  entityType: string;
}

/**
 * Mark a route handler as audited.
 *
 * Args:
 *   action: The audit action (e.g. "appointment.create").
 *   entityType: The entity type acted upon.
 *
 * Returns:
 *   A decorator attaching the audit metadata.
 */
export const Audited = (action: string, entityType: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType } as AuditMeta);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Record the audited action after a successful write.
   *
   * Args:
   *   context: The execution context.
   *   next: The next handler.
   *
   * Returns:
   *   The handler's observable, tapping the audit write on success.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest();
    const principal = request.user as AuthPrincipal | undefined;
    const entityId = request.params?.id ?? null;
    const siteId = request.body?.siteId ?? request.query?.siteId ?? null;

    return next.handle().pipe(
      tap(() => {
        if (principal) {
          void this.audit.record({
            action: meta.action,
            entityType: meta.entityType,
            entityId,
            actorUserId: principal.userId,
            impersonatedBy: principal.impersonatedBy ?? null,
            siteId,
          });
        }
      }),
    );
  }
}
