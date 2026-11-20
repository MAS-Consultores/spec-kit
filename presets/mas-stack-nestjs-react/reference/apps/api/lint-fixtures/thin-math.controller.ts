export class OrdersController {
  quote(price: number, qty: number): number {
    return price * qty;
  }
}
