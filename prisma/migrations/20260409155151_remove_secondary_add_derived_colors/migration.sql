/*
  Warnings:

  - You are about to drop the column `secondaryColor` on the `organizations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "secondaryColor",
ADD COLUMN     "accentHover" TEXT NOT NULL DEFAULT '#E05E35',
ADD COLUMN     "primaryLight" TEXT NOT NULL DEFAULT '#2e3a75',
ALTER COLUMN "primaryColor" SET DEFAULT '#232c57',
ALTER COLUMN "accentColor" SET DEFAULT '#FF7043';
