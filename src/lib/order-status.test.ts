import { describe, expect, it } from 'vitest';
import { canTransition } from './order-status';
describe('order status transitions',()=>{it('allows normal fulfillment',()=>expect(canTransition('CONFIRMED','PICKING')).toBe(true));it('blocks delivered back to packed',()=>expect(canTransition('DELIVERED','PACKED')).toBe(false));it('allows delivered to refund review',()=>expect(canTransition('DELIVERED','REFUND_PENDING')).toBe(true));});
