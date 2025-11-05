/*
  Warnings:

  - You are about to drop the column `code` on the `PasswordResetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `PasswordResetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `usedAt` on the `PasswordResetRequest` table. All the data in the column will be lost.
  - Added the required column `otpHash` to the `PasswordResetRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PasswordResetRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."BorrowStatus" ADD VALUE 'OVERDUE';

-- DropIndex
DROP INDEX "public"."PasswordResetRequest_email_idx";

-- DropIndex
DROP INDEX "public"."PasswordResetRequest_expiresAt_idx";

-- AlterTable
ALTER TABLE "public"."PasswordResetRequest" DROP COLUMN "code",
DROP COLUMN "email",
DROP COLUMN "usedAt",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "consumed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "otpHash" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "PasswordResetRequest_userId_expiresAt_consumed_idx" ON "public"."PasswordResetRequest"("userId", "expiresAt", "consumed");

-- AddForeignKey
ALTER TABLE "public"."PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
