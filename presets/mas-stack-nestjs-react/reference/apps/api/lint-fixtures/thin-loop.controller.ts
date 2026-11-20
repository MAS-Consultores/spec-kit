export class OrdersController {
  total(rows: number[]): number {
    let sum = 0;
    for (const row of rows) {
      sum += row;
    }
    return sum;
  }
}
