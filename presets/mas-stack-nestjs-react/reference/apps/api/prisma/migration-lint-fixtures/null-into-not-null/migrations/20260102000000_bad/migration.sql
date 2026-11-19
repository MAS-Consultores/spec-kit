UPDATE "employees" SET "manager_code" = NULL WHERE "manager_code" = '';
ALTER TABLE "employees" ALTER COLUMN "manager_code" DROP NOT NULL;
