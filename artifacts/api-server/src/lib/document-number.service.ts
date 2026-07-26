import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

// ─── Document Number Service ────────────────────────────────────────────────
//
// Centralized, reusable service for generating sequential document numbers.
// All modules (Sales, Purchases, Delivery Orders, future Invoices) should use
// this service instead of implementing their own numbering logic.
//
// Format: {prefix}-{year}-{sequence}
// Examples:
//   SO-2026-0001     (Sales Order, 4-digit)
//   PO-2026-0001     (Purchase Order, 4-digit)
//   DO-2026-000001   (Delivery Order, 6-digit)
//   INV-2026-000001  (Sales Invoice, 6-digit — future)
//   PAY-2026-000001  (Payment, 6-digit)
// ──────────────────────────────────────────────────────────────────────────────

interface NumberConfig {
  /** Table name to query (e.g. 'sale', 'purchase', 'deliveryOrder', 'payment') */
  model: 'sale' | 'purchase' | 'deliveryOrder' | 'payment';
  /** Prefix for the document number (e.g. 'SO', 'PO', 'DO', 'INV', 'PAY') */
  prefix: string;
  /** Number of digits in the sequence portion (default: 6) */
  sequenceLength?: number;
}

export const DocumentNumberService = {
  /**
   * Generate the next sequential document number for a given model.
   * Can optionally accept a Prisma transaction client for atomicity.
   *
   * @param config  The numbering configuration
   * @param tx      Optional Prisma transaction client
   * @returns       The next document number (e.g. 'DO-2026-000001')
   */
  async generateNextNumber(
    config: NumberConfig,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const { model, prefix, sequenceLength = 6 } = config;
    const year = new Date().getFullYear();
    const fullPrefix = `${prefix}-${year}-`;

    const client = tx ?? prisma;

    // Prisma doesn't support dynamic model access, so we use a map
    const lastRecord = await this._findLastNumber(client, model, fullPrefix);

    if (!lastRecord) {
      return `${fullPrefix}${'1'.padStart(sequenceLength, '0')}`;
    }

    // Extract the sequence part after the last dash
    const parts = lastRecord.split('-');
    const sequencePart = parts[parts.length - 1];
    if (!sequencePart) {
      return `${fullPrefix}${'1'.padStart(sequenceLength, '0')}`;
    }

    const nextSeq = parseInt(sequencePart, 10) + 1;
    return `${fullPrefix}${nextSeq.toString().padStart(sequenceLength, '0')}`;
  },

  async generateInternalSONumber(tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const client = tx ?? prisma;
    
    const [saleRecord, doRecord] = await Promise.all([
      client.sale.findFirst({
        where: { internalSONumber: { startsWith: prefix } },
        orderBy: { internalSONumber: 'desc' },
        select: { internalSONumber: true },
      }),
      client.deliveryOrder.findFirst({
        where: { internalSONumber: { startsWith: prefix } },
        orderBy: { internalSONumber: 'desc' },
        select: { internalSONumber: true },
      })
    ]);

    let nextSeq = 1;
    
    const maxSaleSeq = saleRecord?.internalSONumber 
      ? parseInt(saleRecord.internalSONumber.split('-').pop() ?? '0', 10) 
      : 0;
      
    const maxDOSeq = doRecord?.internalSONumber 
      ? parseInt(doRecord.internalSONumber.split('-').pop() ?? '0', 10) 
      : 0;

    nextSeq = Math.max(maxSaleSeq, maxDOSeq, 0) + 1;
    
    return `${prefix}${nextSeq.toString().padStart(6, '0')}`;
  },

  async generateInvoiceNumber(tx?: Prisma.TransactionClient): Promise<string> {
    return this.generateNextNumber({ model: 'sale', prefix: 'INV', sequenceLength: 6 }, tx);
  },

  async generateDeliveryOrderNumber(tx?: Prisma.TransactionClient): Promise<string> {
    return this.generateNextNumber({ model: 'deliveryOrder', prefix: 'DO', sequenceLength: 6 }, tx);
  },

  /**
   * @internal Find the last document number matching a prefix for a given model.
   */
  async _findLastNumber(
    client: Prisma.TransactionClient | typeof prisma,
    model: NumberConfig['model'],
    prefix: string,
  ): Promise<string | null> {
    // Each model has a 'number' field — query the highest matching the prefix
    switch (model) {
      case 'sale': {
        const record = await client.sale.findFirst({
          where: { number: { startsWith: prefix } },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        return record?.number ?? null;
      }
      case 'purchase': {
        const record = await client.purchase.findFirst({
          where: { number: { startsWith: prefix } },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        return record?.number ?? null;
      }
      case 'deliveryOrder': {
        const record = await client.deliveryOrder.findFirst({
          where: { number: { startsWith: prefix } },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        return record?.number ?? null;
      }
      case 'payment': {
        const record = await client.payment.findFirst({
          where: { number: { startsWith: prefix } },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        return record?.number ?? null;
      }
      default:
        return null;
    }
  },
};
