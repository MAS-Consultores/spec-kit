import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { readCookie } from "../http.js";
import { IS_PUBLIC, SKIP_CSRF } from "./decorators.js";
import type { AccessPayload } from "./jwt-auth.guard.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<string>() !== "http") {
      return true;
    }
    const early = context.switchToHttp().getRequest<Request>();
    if (early.originalUrl.includes("/mcp")) {
      return true;
    }
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip || isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
      return true;
    }
    const cookie = readCookie(request, "csrf_token");
    const header = request.header("x-csrf-token");
    const issued = request.user?.csrf;
    if (
      typeof cookie !== "string" ||
      cookie.length === 0 ||
      cookie !== header ||
      cookie !== issued
    ) {
      throw new ForbiddenException("csrf");
    }
    return true;
  }
}
