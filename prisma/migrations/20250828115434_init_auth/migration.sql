-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."BorrowerType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."BorrowStatus" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."EquipmentStatus" AS ENUM ('NORMAL', 'IN_USE', 'BROKEN', 'LOST', 'WAIT_DISPOSE', 'DISPOSED');

-- CreateEnum
CREATE TYPE "public"."ReturnCondition" AS ENUM ('NORMAL', 'BROKEN', 'LOST', 'WAIT_DISPOSE', 'DISPOSED');

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'EXTERNAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Equipment" (
    "number" SERIAL NOT NULL,
    "idnum" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION,
    "status" "public"."EquipmentStatus" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "public"."BorrowRequest" (
    "id" SERIAL NOT NULL,
    "borrowerType" "public"."BorrowerType" NOT NULL,
    "requesterId" INTEGER,
    "externalName" TEXT,
    "externalDept" TEXT,
    "externalPhone" TEXT,
    "status" "public"."BorrowStatus" NOT NULL DEFAULT 'PENDING',
    "borrowDate" TIMESTAMP(3),
    "returnDue" TIMESTAMP(3) NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "returnCondition" "public"."ReturnCondition",
    "returnNotes" TEXT,
    "receivedById" INTEGER,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "rejectReason" TEXT,
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

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "public"."Department"("name");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "public"."Department"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "public"."User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "public"."Category"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_idnum_key" ON "public"."Equipment"("idnum");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "public"."Equipment"("code");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "public"."Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_categoryId_idx" ON "public"."Equipment"("categoryId");

-- CreateIndex
CREATE INDEX "Equipment_code_idx" ON "public"."Equipment"("code");

-- CreateIndex
CREATE INDEX "Equipment_name_idx" ON "public"."Equipment"("name");

-- CreateIndex
CREATE INDEX "BorrowRequest_status_idx" ON "public"."BorrowRequest"("status");

-- CreateIndex
CREATE INDEX "BorrowRequest_borrowerType_idx" ON "public"."BorrowRequest"("borrowerType");

-- CreateIndex
CREATE INDEX "BorrowRequest_returnDue_idx" ON "public"."BorrowRequest"("returnDue");

-- CreateIndex
CREATE INDEX "BorrowRequest_requesterId_idx" ON "public"."BorrowRequest"("requesterId");

-- CreateIndex
CREATE INDEX "BorrowRequest_approvedById_idx" ON "public"."BorrowRequest"("approvedById");

-- CreateIndex
CREATE INDEX "BorrowRequest_receivedById_idx" ON "public"."BorrowRequest"("receivedById");

-- CreateIndex
CREATE INDEX "BorrowRequest_createdAt_idx" ON "public"."BorrowRequest"("createdAt");

-- CreateIndex
CREATE INDEX "BorrowItem_equipmentId_idx" ON "public"."BorrowItem"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowItem_requestId_equipmentId_key" ON "public"."BorrowItem"("requestId", "equipmentId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_tableName_idx" ON "public"."AuditLog"("tableName");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowRequest" ADD CONSTRAINT "BorrowRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowItem" ADD CONSTRAINT "BorrowItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."BorrowRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BorrowItem" ADD CONSTRAINT "BorrowItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "public"."Equipment"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
