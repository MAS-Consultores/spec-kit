export function Logout(): Promise<Response> {
  return fetch("/api/v1/auth/logout");
}
