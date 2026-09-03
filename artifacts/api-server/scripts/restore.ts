import fs from 'fs';
import path from 'path';
import { backupService, type BackupData } from '../src/modules/backup/backup.service.js';
import { prisma } from '../src/lib/prisma.js';

async function runRestore() {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    console.error('Usage: pnpm exec tsx scripts/restore.ts <path-to-backup-file.json>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePathArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Backup file not found at: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`--- Starting Al-Bunyan System Restore ---`);
  console.log(`Loading backup from: ${resolvedPath}...`);

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const backupData: BackupData = JSON.parse(raw);

  console.log(`Backup metadata:`);
  console.log(`  Exported At: ${backupData.exportedAt}`);
  console.log(`  Exported By: ${backupData.exportedBy}`);
  console.log(`  Total Records: ${backupData.metadata.totalRecords}`);

  console.log(`Executing atomic restore transaction...`);
  const startTime = Date.now();
  const result = await backupService.restore(backupData);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`✓ System Restore completed successfully in ${elapsed}s!`);
  console.log(`  Total records restored: ${result.restoredRecords}`);
}

runRestore()
  .catch(err => {
    console.error('Restore failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
