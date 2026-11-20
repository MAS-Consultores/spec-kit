/** Prisma delegate names each Nest module is allowed to touch from its repository. */
export const modelOwnership = {
  auth: ["user", "permission", "userPermission", "refreshToken"],
  audit: ["auditLog"],
  throttle: ["rateLimitBucket"],
};
