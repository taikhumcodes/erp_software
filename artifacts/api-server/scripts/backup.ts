import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { backupService } from '../src/modules/backup/backup.service.js';
import { prisma } from '../src/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBackup() {
  console.log('--- Starting Al-Bunyan Full System Backup ---');
  const startTime = Date.now();

  const backupData = await backupService.exportAll('CLI admin@albunyan.com');

  const backupsDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `al-bunyan-backup-${timestamp}.json`;
  const filePath = path.join(backupsDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const sizeMb = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

  console.log(`✓ Backup completed successfully in ${elapsed}s!`);
  console.log(`  File: ${filePath}`);
  console.log(`  File size: ${sizeMb} MB`);
  console.log(`  Total records: ${backupData.metadata.totalRecords}`);
  console.log('  Tables backed up:');
  for (const [table, count] of Object.entries(backupData.metadata.tables)) {
    if (count > 0) {
      console.log(`    - ${table}: ${count}`);
    }
  }
}

runBackup()
  .catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
