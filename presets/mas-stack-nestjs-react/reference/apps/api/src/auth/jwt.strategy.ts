import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { configString } from "../config/read.js";
import { readCookie } from "../http.js";
import type { AccessPayload } from "./jwt-auth.guard.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          return readCookie(request, "access_token") ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configString(config, "JWT_ACCESS_SECRET"),
    });
  }

  validate(payload: AccessPayload): AccessPayload {
    return { sub: payload.sub, scopes: payload.scopes, csrf: payload.csrf };
  }
}
