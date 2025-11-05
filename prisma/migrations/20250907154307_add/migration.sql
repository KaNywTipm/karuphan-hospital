-- AlterTable
ALTER TABLE "public"."BorrowRequest" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
