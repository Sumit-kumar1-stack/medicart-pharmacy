import type { OrderStatus } from '@prisma/client';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PRESCRIPTION_REVIEW: ['PAYMENT_PENDING','CANCELLED'],
  PAYMENT_PENDING: ['CONFIRMED','CANCELLED'],
  CONFIRMED: ['PICKING','CANCELLED'],
  PICKING: ['PACKED','CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY','CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUND_PENDING'],
  CANCELLED: [],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: []
};
export function canTransition(from:OrderStatus,to:OrderStatus){return transitions[from].includes(to)}
export function nextStatuses(from:OrderStatus){return transitions[from]}
