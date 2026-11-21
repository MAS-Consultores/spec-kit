export function createUser(name: string, email: string, age: number, country: string): string {
  return `${name}:${email}:${age}:${country}`;
}
