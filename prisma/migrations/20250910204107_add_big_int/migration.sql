-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "telegramId" BIGINT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "childUserId" TEXT NOT NULL,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_telegramId_key" ON "public"."Account"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "public"."Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_childUserId_key" ON "public"."Account"("childUserId");
