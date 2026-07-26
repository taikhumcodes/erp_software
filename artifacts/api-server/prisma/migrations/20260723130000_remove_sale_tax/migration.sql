-- Kuwait business rule: VAT/Tax is not part of this client's business process.
-- Sales is not yet implemented, but its schema was scaffolded ahead of time
-- with a tax column that will never be used. Remove it so no tax-bearing
-- fields remain anywhere in the schema. Grand Total = Subtotal - Discount.
ALTER TABLE "sales" DROP COLUMN "tax";
