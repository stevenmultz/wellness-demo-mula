-- AlterEnum
ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'REFUND_REQUESTED';

-- AlterTable
ALTER TABLE "programs" ADD COLUMN "min_quota" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN "refund_amount" INTEGER,
ADD COLUMN "refund_fee_amount" INTEGER,
ADD COLUMN "refund_reason" TEXT,
ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "refunded_by_id" TEXT;
