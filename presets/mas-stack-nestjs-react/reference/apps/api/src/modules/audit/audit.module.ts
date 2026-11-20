import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "../prisma/index.js";
import { AuditInterceptor } from "./audit.interceptor.js";
import { AuditRepository } from "./audit.repository.js";
import { AuditService } from "./audit.service.js";

@Module({
  imports: [PrismaModule],
  providers: [
    AuditRepository,
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {
  readonly label = "audit";
}
