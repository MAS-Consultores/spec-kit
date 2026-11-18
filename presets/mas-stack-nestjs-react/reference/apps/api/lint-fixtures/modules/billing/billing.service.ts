import { AuthService } from "../../../src/modules/auth/auth.service.ts";

export class BillingService {
  constructor(private readonly auth: AuthService) {}
}
