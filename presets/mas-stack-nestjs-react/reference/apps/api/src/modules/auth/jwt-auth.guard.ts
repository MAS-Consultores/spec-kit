import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { readCookie } from "../../http.js";
import { IS_PUBLIC } from "./auth.decorators.js";
import { SessionLookup } from "./session.service.js";
import { type AccessPayload, accessTokenStillValid, restrictedSessionAllows } from "./session.token.js";

export type { AccessPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly sessions: SessionLookup,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (context.getType<string>() !== "http") {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AccessPayload }>();
    if (request.originalUrl.includes("/mcp")) {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const token = readCookie(request, "access_token");
    if (!token) {
      throw new UnauthorizedException();
    }
    let payload: AccessPayload;
    try {
      payload = this.jwt.verify<AccessPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    return this.acceptSession(request, payload);
  }

  private async acceptSession(
    request: Request & { user?: AccessPayload },
    payload: AccessPayload,
  ): Promise<boolean> {
    const user = await this.sessions.findStamp(payload.sub);
    if (!user || !accessTokenStillValid(user, payload)) {
      throw new UnauthorizedException();
    }
    if (user.mustChangePassword && !restrictedSessionAllows(request.originalUrl)) {
      throw new ForbiddenException();
    }
    request.user = payload;
    return true;
  }
}
