import { OrdersService } from "../orders/index.js";

export class BillingService {
  constructor(private readonly orders: OrdersService) {}
}
