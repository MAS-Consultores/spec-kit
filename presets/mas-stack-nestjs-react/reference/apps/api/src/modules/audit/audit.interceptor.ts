import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Observable } from "rxjs";
import { firstValueFrom, of } from "rxjs";
import { AUDIT_EVENT, NO_AUDIT } from "./audit.decorators.js";
import { AuditService } from "./audit.service.js";

interface RequestUser {
  user?: { sub?: string };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const skipped = this.reflector.get<string | undefined>(NO_AUDIT, context.getHandler());
    const eventKey = this.reflector.get<string | undefined>(AUDIT_EVENT, context.getHandler());
    if (skipped || !eventKey) return next.handle();
    const request = context.switchToHttp().getRequest<RequestUser>();
    const actorId = request.user?.sub && request.user.sub.length > 0 ? request.user.sub : "anonymous";
    return this.finish(next, eventKey, actorId);
  }

  private async finish(next: CallHandler, eventKey: string, actorId: string): Promise<Observable<unknown>> {
    try {
      const value: unknown = await firstValueFrom(next.handle());
      await this.audit.record({ eventKey, result: "success", actorId, subjectId: null });
      return of(value);
    } catch (error) {
      await this.audit.record({ eventKey, result: "failure", actorId, subjectId: null });
      throw error;
    }
  }
}
