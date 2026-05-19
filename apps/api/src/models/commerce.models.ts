export interface CartItem { productId: string; quantity: number; unitPrice: number; lineTotal: number }
export interface Cart { id: string; version: number; items: CartItem[]; subtotal: number; grandTotal: number; status: 'active' | 'ordered' }
export interface Order { id: string; cartId: string; status: 'pending_confirmation' | 'confirmed'; total: number; items: CartItem[] }
export interface PaymentIntent { id: string; orderId: string; provider: 'mock'; status: 'created'; amount: number; paymentUrl: string }
