import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AUTHENTICATED, CAN_KEY, IS_PUBLIC } from "./auth.decorators.js";
import type { AccessPayload } from "./jwt-auth.guard.js";
import { isMcpTransport } from "./session.token.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<string>() !== "http") {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    if (isMcpTransport(request.originalUrl)) {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const required = this.reflector.get<string>(CAN_KEY, context.getHandler());
    const authenticated = this.reflector.get<boolean>(AUTHENTICATED, context.getHandler());
    if (authenticated && !request.user) {
      throw new UnauthorizedException();
    }
    if (!required) {
      return true;
    }
    const scopes = request.user?.scopes ?? [];
    if (!scopes.includes(required)) {
      throw new ForbiddenException("casl");
    }
    return true;
  }
}
