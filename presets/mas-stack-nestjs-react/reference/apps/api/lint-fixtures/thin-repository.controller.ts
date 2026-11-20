import { OrdersRepository } from "./orders.repository.js";

export class OrdersController {
  constructor(private readonly orders: OrdersRepository) {}

  list(): Promise<unknown> {
    return this.orders.findMany();
  }
}
