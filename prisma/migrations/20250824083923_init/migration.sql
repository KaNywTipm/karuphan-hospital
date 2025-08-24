-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."BorrowerType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."BorrowStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."EquipmentStatus" AS ENUM ('NORMAL', 'BROKEN', 'LOST', 'WAIT_DISPOSE', 'DISPOSED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'EXTERNAL',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Equipment" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(12,2),
    "status" "public"."EquipmentStatus" NOT NULL DEFAULT 'NORMAL',
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BorrowRequest" (
    "id" SERIAL NOT NULL,
    "borrowerType" "public"."BorrowerType" NOT NULL,
    "requesterId" INTEGER,
    "externalName" TEXT,
    "externalDept" TEXT,
    "status" "public"."BorrowStatus" NOT NULL DEFAULT 'PENDING',
    "borrowDate" TIMESTAMP(3),
    "returnDue" TIMESTAMP(3) NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "returnCondition" "public"."EquipmentStatus",
    "returnNotes" TEXT,
    "receivedById" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BorrowItem" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BorrowItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "public"."Equipment"("code");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "public"."Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_categoryId_idx" ON "public"."Equipment"("categoryId");

-- CreateIndex
CREATE INDEX "BorrowRequest_status_idx" ON "public"."BorrowRequest"("status");

-- CreateIndex
CREATE INDEX "BorrowRequest_borrowerType_idx" ON "public"."BorrowRequest"("borrowerType");

-- CreateIndex
CREATE INDEX "BorrowRequest_returnDue_idx" ON "public"."BorrowRequest"("returnDue");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowItem_requestId_equipmentId_key" ON "public"."BorrowItem"("requestId", "equipmentId");

-- AddForeignKey
ALTER TABLE "public"."Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowItem" ADD CONSTRAINT "BorrowItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."BorrowRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowItem" ADD CONSTRAINT "BorrowItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "public"."Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
