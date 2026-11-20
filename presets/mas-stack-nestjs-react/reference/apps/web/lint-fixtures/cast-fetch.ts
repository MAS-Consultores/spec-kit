type User = { id: string };

export async function loadUser(input: RequestInfo): Promise<User> {
  const response = await fetch(input);
  return (await response.json()) as User;
}
