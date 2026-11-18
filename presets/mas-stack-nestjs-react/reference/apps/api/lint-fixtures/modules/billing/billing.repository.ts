export class BillingRepository {
  load(prisma: { user: { findFirst(): Promise<unknown> } }): Promise<unknown> {
    return prisma.user.findFirst();
  }
}
