import assert from 'node:assert/strict';
import { calculateVatRule, splitGrossAmount } from '../src/services/tax.service.js';
import { isCommissionBlockedUser } from '../src/services/commission.service.js';

const beforeCutoff = new Date('2026-06-30T12:00:00.000Z');
const afterCutoff = new Date('2026-07-01T12:00:00.000Z');

assert.deepEqual(
  calculateVatRule({ country: 'AT', vatId: 'ATU12345678', date: beforeCutoff, vatIdValid: true }),
  {
    country: 'AT',
    vatRate: 20,
    vatType: 'standard',
    isReverseCharge: false,
    vatNote: '',
  },
  'Austrian UID must not trigger Reverse Charge',
);

assert.equal(
  calculateVatRule({ country: 'DE', vatId: 'BAD-UID', date: beforeCutoff, vatIdValid: false }).vatRate,
  20,
  'German invalid UID before cutoff is treated like no UID and taxed at 20%',
);

assert.equal(
  calculateVatRule({ country: 'DE', vatId: 'BAD-UID', date: afterCutoff, vatIdValid: false }).vatRate,
  19,
  'German invalid UID after cutoff is treated like no UID and taxed at 19%',
);

const germanReverseCharge = calculateVatRule({
  country: 'DE',
  vatId: 'DE123456789',
  date: beforeCutoff,
  vatIdValid: true,
});
assert.equal(germanReverseCharge.vatRate, 0);
assert.equal(germanReverseCharge.isReverseCharge, true);

assert.deepEqual(
  splitGrossAmount(100, 20),
  { netAmount: 83.33, vatAmount: 16.67, grossAmount: 100 },
  'Fee invoices split paid gross amount into net and VAT',
);

assert.equal(isCommissionBlockedUser({ email: 'technik@clyr.shop', role: 'partner' }), true);
assert.equal(isCommissionBlockedUser({ email: 'theresa@clyr.at', role: 'admin' }), false);
assert.equal(isCommissionBlockedUser({ email: 'partner@example.com', role: 'partner' }), false);

console.log('Billing rule verification passed');
