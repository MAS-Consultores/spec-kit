export function ask(): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", { method: "POST" });
}
