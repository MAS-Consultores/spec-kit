import { SetMetadata } from "@nestjs/common";

const SENSITIVE_ROUTE = "mas:sensitive-route";

/**
 * Marks auth, recovery, AI, and upload routes.
 * The global ThrottlerGuard still applies LOGIN_THROTTLE_LIMIT from the Zod config.
 * A @Throttle() override would ignore that value, so the skeleton uses this marker instead.
 */
export function SensitiveThrottle(): MethodDecorator {
  return SetMetadata(SENSITIVE_ROUTE, true);
}
