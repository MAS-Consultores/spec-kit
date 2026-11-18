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
  mustChangePassword: boolean;
}

export function businessScopes(
  user: SessionStamp & { permissions: { permission: { code: string } }[] },
): string[] {
  if (user.mustChangePassword) {
    return [];
  }
  return user.permissions.map((row) => row.permission.code);
}

/** Reject tokens from before a password change or an older token version. */
export function accessTokenStillValid(user: SessionStamp, payload: AccessPayload): boolean {
  if (payload.ver !== user.tokenVersion) {
    return false;
  }
  if (user.passwordChangedAt) {
    const issuedMs = typeof payload.iat === "number" ? payload.iat * 1000 : 0;
    if (issuedMs <= user.passwordChangedAt.getTime()) {
      return false;
    }
  }
  return true;
}

export function restrictedSessionAllows(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return /\/auth\/(?:me|logout|password)\/?$/.test(path);
}
