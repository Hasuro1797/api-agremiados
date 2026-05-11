/*
  Warnings:

  - You are about to drop the column `peopleAvailable` on the `activities` table. All the data in the column will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "activities" DROP COLUMN "peopleAvailable";

-- DropTable
DROP TABLE "role_permissions";

-- DropEnum
DROP TYPE "PeopleAvailable";
