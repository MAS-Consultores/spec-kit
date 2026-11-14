import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { CAN_KEY, IS_PUBLIC } from "./decorators.js";
import type { AccessPayload } from "./jwt-auth.guard.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<string>() !== "http") {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    if ((request.originalUrl ?? request.url).includes("/mcp")) {
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
