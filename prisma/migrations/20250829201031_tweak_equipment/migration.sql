/*
  Warnings:

  - You are about to alter the column `price` on the `Equipment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - A unique constraint covering the columns `[categoryId,idnum]` on the table `Equipment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Equipment_idnum_key";

-- AlterTable
ALTER TABLE "public"."Equipment" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_categoryId_idnum_key" ON "public"."Equipment"("categoryId", "idnum");
