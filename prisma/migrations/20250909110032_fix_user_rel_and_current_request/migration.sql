/*
  Warnings:

  - You are about to drop the column `userId` on the `BorrowRequest` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Equipment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BorrowRequest" DROP CONSTRAINT "BorrowRequest_userId_fkey";

-- AlterTable
ALTER TABLE "public"."BorrowRequest" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."Equipment" DROP COLUMN "description",
ADD COLUMN     "currentRequestId" INTEGER,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "statusNote" TEXT;

-- CreateIndex
CREATE INDEX "Equipment_currentRequestId_idx" ON "public"."Equipment"("currentRequestId");

-- AddForeignKey
ALTER TABLE "public"."Equipment" ADD CONSTRAINT "Equipment_currentRequestId_fkey" FOREIGN KEY ("currentRequestId") REFERENCES "public"."BorrowRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
