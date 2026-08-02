import { PrismaClient } from '@prisma/client';
import { FinanceLedgerService } from './src/modules/finance/finance-ledger.service.js';

const prisma = new PrismaClient();

async function main() {
  // Get all active partner capital accounts
  const partners = await prisma.financeAccount.findMany({
    where: { type: 'PARTNER_CAPITAL', status: 'ACTIVE' }
  });

  if (partners.length < 2) {
    console.log("Need at least 2 partners to redistribute.");
    return;
  }

  const numPartners = partners.length;
  console.log(`Found ${numPartners} partners.`);

  // Get all profit share entries that were solely assigned to Nazar (or the first partner)
  // For simplicity, let's just get all PROFIT_SHARE entries for INV-2026-000001 and INV-2026-000002
  const profitEntries = await prisma.financeLedger.findMany({
    where: { 
      entryType: 'PROFIT_SHARE',
      credit: { gt: 0 }
    }
  });

  await prisma.$transaction(async (tx) => {
    // We group by referenceId (the sale ID)
    const grouped = new Map<string, any[]>();
    for (const entry of profitEntries) {
      if (!entry.referenceId) continue;
      if (!grouped.has(entry.referenceId)) grouped.set(entry.referenceId, []);
      grouped.get(entry.referenceId)!.push(entry);
    }

    for (const [saleId, entries] of Array.from(grouped.entries())) {
      // If this sale was only distributed to 1 person but we now have N partners
      if (entries.length < numPartners) {
        // Calculate total profit for this sale
        const totalProfit = entries.reduce((sum, e) => sum + Number(e.credit), 0);
        const splitAmount = (totalProfit / numPartners).toFixed(3);
        console.log(`Redistributing Sale ${entries[0].referenceNumber}: Total ${totalProfit}, New Split: ${splitAmount}`);

        // Delete old entries
        await tx.financeLedger.deleteMany({
          where: { referenceId: saleId, entryType: 'PROFIT_SHARE' }
        });

        // Create new split entries for all partners
        for (const partner of partners) {
          await FinanceLedgerService.postEntry(tx, {
            accountId: partner.id,
            entryType: 'PROFIT_SHARE',
            credit: Number(splitAmount),
            description: entries[0].description || `Profit Share from Sale`,
            referenceNumber: entries[0].referenceNumber,
            referenceId: saleId,
            createdById: entries[0].createdById,
          });
        }
      }
    }
  });

  console.log("Successfully redistributed past profits.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
