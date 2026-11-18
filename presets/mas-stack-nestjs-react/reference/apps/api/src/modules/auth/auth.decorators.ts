import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";
export const SKIP_CSRF = "skipCsrf";
export const CAN_KEY = "can";
export const AUTHENTICATED = "authenticated";

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);
export const SkipCsrf = (): MethodDecorator & ClassDecorator => SetMetadata(SKIP_CSRF, true);
export const Can = (permission: string): MethodDecorator => SetMetadata(CAN_KEY, permission);

/**
 * Session routes that only require a valid access token.
 * Do not put a sample-module permission here. `login` and `refresh` stay `@Public()`
 * because they establish the session from the refresh cookie. `logout` and `me` use this decorator.
 */
export const Authenticated = (): MethodDecorator => SetMetadata(AUTHENTICATED, true);
