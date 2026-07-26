-- Kuwait business rule: VAT/Tax is not part of this client's business process.
-- Remove the tax column from purchases; Grand Total is now Subtotal - Discount.
ALTER TABLE "purchases" DROP COLUMN "tax";
