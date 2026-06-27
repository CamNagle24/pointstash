-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyAffordable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AffordabilityAlert" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redemptionOptionId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffordabilityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffordabilityAlert_userId_idx" ON "AffordabilityAlert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AffordabilityAlert_accountId_redemptionOptionId_key" ON "AffordabilityAlert"("accountId", "redemptionOptionId");

-- AddForeignKey
ALTER TABLE "AffordabilityAlert" ADD CONSTRAINT "AffordabilityAlert_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffordabilityAlert" ADD CONSTRAINT "AffordabilityAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffordabilityAlert" ADD CONSTRAINT "AffordabilityAlert_redemptionOptionId_fkey" FOREIGN KEY ("redemptionOptionId") REFERENCES "RedemptionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

