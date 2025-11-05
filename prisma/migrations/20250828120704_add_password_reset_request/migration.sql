-- CreateTable
CREATE TABLE "public"."PasswordResetRequest" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetRequest_email_idx" ON "public"."PasswordResetRequest"("email");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_expiresAt_idx" ON "public"."PasswordResetRequest"("expiresAt");
