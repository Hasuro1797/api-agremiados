-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "dni" DROP NOT NULL;
