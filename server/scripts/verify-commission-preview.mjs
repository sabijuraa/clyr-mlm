import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { mock, test } from 'node:test';

mock.module(new URL('../src/config/database.js', import.meta.url).href, {
  defaultExport: { query: () => { throw new Error('Preview must not access payouts or financial records'); } },
  namedExports: { query: () => { throw new Error('Unexpected database access'); } },
});
const { default: invoiceService, generateCommissionPreview } = await import('../src/services/invoice.service.js');
invoiceService.getCompanyInfo = async () => ({ name: 'CLYR Solutions GmbH', address: 'Example Street', zip: '1000', city: 'Example', country: 'AT', email: 'support@example.test', website: 'example.test' });

test('provisional PDF renders mixed statuses without issuing a credit-note number or querying payouts', async () => {
  const commissions = [
    { order_number: 'TEST-001', customer_name: 'Example Customer', status: 'held', amount: '27.00' },
    { order_number: 'TEST-002', customer_name: 'Example Customer Two', status: 'held', amount: '9.00' },
    { order_number: 'TEST-003', customer_name: 'Example Customer Three', status: 'pending', amount: '1.23' },
  ];
  const pdf = await generateCommissionPreview({ first_name: 'Example', last_name: 'Partner' }, commissions, 'Oktober 2026');
  assert.ok(pdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
  assert.match(pdf.toString('latin1').slice(-50), /%%EOF/);
  if (process.env.PREVIEW_SAMPLE_DIR) {
    await fs.mkdir(process.env.PREVIEW_SAMPLE_DIR, { recursive: true });
    await fs.writeFile(path.join(process.env.PREVIEW_SAMPLE_DIR, 'commission-preview-sample.pdf'), pdf);
  }
});
