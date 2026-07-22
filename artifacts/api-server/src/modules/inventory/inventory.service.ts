import { Prisma } from '@prisma/client';

// ─── Inventory Service ────────────────────────────────────────────────────────
//
// Centralized, reusable service for stock movements.
// All future modules (Sales, Delivery Orders, Returns, Inventory Adjustments)
// should call this service instead of modifying stock directly.
//
// Every method accepts a Prisma.TransactionClient so the caller controls
// the transaction boundary.  This ensures atomicity when stock adjustments
// are combined with other writes (e.g. updating a purchase status).
// ──────────────────────────────────────────────────────────────────────────────

export const InventoryService = {
  /**
   * Adjust stock for a single product by a delta (positive = increase, negative = decrease).
   * Throws if the resulting stock would be negative.
   *
   * @param tx          Prisma transaction client
   * @param productId   The product to adjust
   * @param delta       Decimal-string quantity to add (positive) or subtract (negative)
   */
  async adjustStock(
    tx: Prisma.TransactionClient,
    productId: string,
    delta: string,
  ): Promise<void> {
    const deltaDecimal = new Prisma.Decimal(delta);

    // Skip zero adjustments
    if (deltaDecimal.isZero()) return;

    // Read the current stock inside the transaction for consistency
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, stockQuantity: true, name: true },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const newStock = product.stockQuantity.add(deltaDecimal);

    if (newStock.lessThan(new Prisma.Decimal('0'))) {
      throw new Error(
        `Insufficient stock for product "${product.name}". ` +
        `Current: ${product.stockQuantity.toFixed(3)}, ` +
        `Requested change: ${deltaDecimal.toFixed(3)}, ` +
        `Would result in: ${newStock.toFixed(3)}`,
      );
    }

    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: newStock },
    });
  },

  /**
   * Increase stock for a product (convenience wrapper).
   */
  async increaseStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: string,
  ): Promise<void> {
    const qty = new Prisma.Decimal(quantity);
    if (qty.lessThanOrEqualTo(new Prisma.Decimal('0'))) {
      throw new Error('Increase quantity must be positive');
    }
    return this.adjustStock(tx, productId, quantity);
  },

  /**
   * Decrease stock for a product (convenience wrapper).
   * Throws if the resulting stock would be negative.
   */
  async decreaseStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: string,
  ): Promise<void> {
    const qty = new Prisma.Decimal(quantity);
    if (qty.lessThanOrEqualTo(new Prisma.Decimal('0'))) {
      throw new Error('Decrease quantity must be positive');
    }
    return this.adjustStock(tx, productId, qty.negated().toFixed(3));
  },

  /**
   * Apply stock adjustments for a batch of items (e.g. purchase line items).
   * Each item is an object with { productId, quantity }.
   * Positive quantities increase stock; negative decrease.
   */
  async adjustStockBatch(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string; quantity: string }>,
  ): Promise<void> {
    for (const item of items) {
      await this.adjustStock(tx, item.productId, item.quantity);
    }
  },
};
