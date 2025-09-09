/* Drop BorrowRequest.userId and Equipment.description; add holding fields */

-- BorrowRequest.userId (ถ้ามีอยู่เดิมในฐาน)
ALTER TABLE "public"."BorrowRequest" DROP CONSTRAINT IF EXISTS "BorrowRequest_userId_fkey";
ALTER TABLE "public"."BorrowRequest" DROP COLUMN IF EXISTS "userId";

-- Equipment.description + เพิ่มฟิลด์สถานะการถือครองให้ตรงสคีม่า
ALTER TABLE "public"."Equipment"
  DROP COLUMN IF EXISTS "description",
  ADD COLUMN IF NOT EXISTS "currentRequestId" INTEGER,
  ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "statusNote" TEXT;

-- กรณีเคยมี default ของ role ให้ลบออก (สอดคล้องกับสคีม่าปัจจุบันที่ไม่ตั้ง default)
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;

-- สร้างดัชนี (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'Equipment_currentRequestId_idx'
  ) THEN
    CREATE INDEX "Equipment_currentRequestId_idx" ON "public"."Equipment"("currentRequestId");
  END IF;
END $$;

-- ใส่ FK ให้ currentRequestId → BorrowRequest(id)
ALTER TABLE "public"."Equipment" DROP CONSTRAINT IF EXISTS "Equipment_currentRequestId_fkey";
ALTER TABLE "public"."Equipment"
  ADD CONSTRAINT "Equipment_currentRequestId_fkey"
  FOREIGN KEY ("currentRequestId")
  REFERENCES "public"."BorrowRequest"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
