import { OrdersService } from "../orders/orders.service.js";

export class BillingService {
  constructor(private readonly orders: OrdersService) {}
}
