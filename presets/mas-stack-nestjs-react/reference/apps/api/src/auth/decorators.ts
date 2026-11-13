import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";
export const SKIP_CSRF = "skipCsrf";
export const CAN_KEY = "can";

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);
export const SkipCsrf = (): MethodDecorator & ClassDecorator => SetMetadata(SKIP_CSRF, true);
export const Can = (permission: string): MethodDecorator => SetMetadata(CAN_KEY, permission);
