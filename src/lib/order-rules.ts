export type RxCheckItem = { productId: string; quantity: number; prescriptionRequired: boolean };
export type RxApproval = { productId: string; maxQuantity: number | null };

export function assertPrescriptionCoverage(items: RxCheckItem[], approvals: RxApproval[]) {
  const approved = new Map(approvals.map((x) => [x.productId, x.maxQuantity]));
  for (const item of items.filter((x) => x.prescriptionRequired)) {
    if (!approved.has(item.productId)) throw new Error(`Prescription does not authorize product ${item.productId}`);
    const max = approved.get(item.productId);
    if (max != null && item.quantity > max) throw new Error(`Prescription quantity exceeded for product ${item.productId}`);
  }
}
