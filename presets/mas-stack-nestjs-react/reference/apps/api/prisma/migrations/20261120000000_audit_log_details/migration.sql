ALTER TABLE "audit_logs" ADD COLUMN "subject_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "result" TEXT NOT NULL DEFAULT 'success';
ALTER TABLE "audit_logs" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
