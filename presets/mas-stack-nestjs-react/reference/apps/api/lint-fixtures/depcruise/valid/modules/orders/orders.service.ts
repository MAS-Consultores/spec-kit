import { OrdersRepository } from "./orders.repository.js";

export class OrdersService {
  constructor(private readonly orders: OrdersRepository) {}
}
