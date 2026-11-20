import { OrdersService } from "./orders.service.js";

export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
}
