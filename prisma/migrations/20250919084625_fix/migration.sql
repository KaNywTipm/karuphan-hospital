/*
  Warnings:

  - The values [OVERDUE] on the enum `BorrowStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actualBorrowDate` on the `BorrowRequest` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BorrowStatus_new" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED');
ALTER TABLE "public"."BorrowRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."BorrowRequest" ALTER COLUMN "status" TYPE "public"."BorrowStatus_new" USING ("status"::text::"public"."BorrowStatus_new");
ALTER TYPE "public"."BorrowStatus" RENAME TO "BorrowStatus_old";
ALTER TYPE "public"."BorrowStatus_new" RENAME TO "BorrowStatus";
DROP TYPE "public"."BorrowStatus_old";
ALTER TABLE "public"."BorrowRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."BorrowRequest" DROP COLUMN "actualBorrowDate";
