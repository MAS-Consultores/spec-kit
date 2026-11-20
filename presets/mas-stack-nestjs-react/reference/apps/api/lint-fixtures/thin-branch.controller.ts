class OrdersService {
  admin(): { ok: true } {
    return { ok: true };
  }
}

export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  act(role: string): { ok: true } | undefined {
    if (role === "admin") {
      return this.orders.admin();
    }
    return undefined;
  }
}
