import { describe, expect, it } from 'vitest';
import { assertPrescriptionCoverage } from './order-rules';

describe('assertPrescriptionCoverage', () => {
  it('allows OTC products without approvals', () => {
    expect(() => assertPrescriptionCoverage([{ productId: 'a', quantity: 1, prescriptionRequired: false }], [])).not.toThrow();
  });
  it('blocks unapproved prescription products', () => {
    expect(() => assertPrescriptionCoverage([{ productId: 'rx', quantity: 1, prescriptionRequired: true }], [])).toThrow();
  });
  it('enforces max quantity', () => {
    expect(() => assertPrescriptionCoverage(
      [{ productId: 'rx', quantity: 3, prescriptionRequired: true }],
      [{ productId: 'rx', maxQuantity: 2 }]
    )).toThrow();
  });
});
