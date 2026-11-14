import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { readCookie } from "../http.js";
import { AuthService } from "./auth.service.js";
import { Authenticated, Public } from "./decorators.js";
import type { AccessPayload } from "./jwt-auth.guard.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: unknown, @Res({ passthrough: true }) res: Response): Promise<{ csrfToken: string }> {
    return this.auth.login(body, res);
  }

  @Public()
  @Post("refresh")
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ csrfToken: string }> {
    return this.auth.refresh(readCookie(request, "refresh_token"), res);
  }

  @Authenticated()
  @Post("logout")
  logout(
    @Req() request: Request & { user?: AccessPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ csrfToken: string }> {
    return this.auth.logout(request.user?.sub ?? "", res);
  }

  @Authenticated()
  @Get("me")
  me(@Req() request: Request & { user?: AccessPayload }): { sub: string } {
    return { sub: request.user?.sub ?? "" };
  }
}
