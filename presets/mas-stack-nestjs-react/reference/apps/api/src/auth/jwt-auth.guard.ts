import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { readCookie } from "../http.js";
import { IS_PUBLIC } from "./decorators.js";

export interface AccessPayload {
  sub: string;
  scopes: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<string>() !== "http") {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    const token = readCookie(request, "access_token");
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = this.jwt.verify<AccessPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
