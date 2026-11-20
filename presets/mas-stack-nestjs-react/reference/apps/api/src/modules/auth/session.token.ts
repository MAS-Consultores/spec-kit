export interface AccessPayload {
  sub: string;
  scopes: string[];
  csrf: string;
  ver: number;
  iat?: number;
}

export interface SessionStamp {
  tokenVersion: number;
  passwordChangedAt: Date | null;
  shouldChangePassword: boolean;
}

export function businessScopes(
  user: SessionStamp & { permissions: { permission: { code: string } }[] },
): string[] {
  if (user.shouldChangePassword) {
    return [];
  }
  return user.permissions.map((row) => row.permission.code);
}

/** Reject tokens from before a password change or an older token version. */
export function accessTokenStillValid(user: SessionStamp, payload: AccessPayload): boolean {
  if (payload.ver !== user.tokenVersion) {
    return false;
  }
  if (user.passwordChangedAt !== null) {
    const issuedMs = typeof payload.iat === "number" ? payload.iat * 1000 : 0;
    if (issuedMs <= user.passwordChangedAt.getTime()) {
      return false;
    }
  }
  return true;
}

/** Path only. A query or fragment that mentions a bypass must not count. */
function requestPath(url: string): string {
  const withoutHash = url.split("#")[0] ?? "";
  return withoutHash.split("?")[0] ?? "";
}

export function isMcpTransport(url: string): boolean {
  const segments = requestPath(url).split("/").filter((segment) => segment.length > 0);
  return segments.includes("mcp");
}

export function restrictedSessionAllows(url: string): boolean {
  return /\/auth\/(?:me|logout|password)\/?$/.test(requestPath(url));
}

/** Refresh tokens carry `iat`, not the access-token version claim. */
export function refreshIssuedAfterPasswordChange(
  user: SessionStamp,
  issuedAtSeconds: number | undefined,
): boolean {
  if (user.passwordChangedAt === null) {
    return true;
  }
  const issuedMs = typeof issuedAtSeconds === "number" ? issuedAtSeconds * 1000 : 0;
  return issuedMs > user.passwordChangedAt.getTime();
}
