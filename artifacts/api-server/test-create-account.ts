import { FinanceAccountsService } from './src/modules/finance/finance-accounts.service.js';

FinanceAccountsService.create('test-user', {
  name: 'Test Partner',
  type: 'PARTNER_CAPITAL',
  currency: 'KWD',
  openingBalance: 0
}).then(console.log).catch(console.error);
