class HttpClient {
  request(): void {
    return undefined;
  }
}

export class BillingService {
  charge(): number {
    const stamp = Date.now();
    const today = new Date();
    const salt = Math.random();
    const client = new HttpClient();
    return stamp + today.getTime() + salt + (client ? 0 : 1);
  }
}
