ALTER TABLE "employees" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;
UPDATE "employees" SET "manager_code" = 'unassigned' WHERE "manager_code" IS NULL;
ALTER TABLE "employees" ALTER COLUMN "manager_code" SET NOT NULL;
-- mas:allow-destructive contract phase removes legacy_code after readers stopped
ALTER TABLE "employees" DROP COLUMN "legacy_code";
