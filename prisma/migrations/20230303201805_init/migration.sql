/*
  Warnings:

  - Made the column `countryId` on table `City` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "City" DROP CONSTRAINT "City_countryId_fkey";

-- AlterTable
ALTER TABLE "City" ALTER COLUMN "countryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
