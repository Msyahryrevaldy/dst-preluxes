import crypto from 'node:crypto';
import type { Order } from '../src/types/store.ts';

export interface MidtransConfigState {
  configured: boolean;
  clientKey: string;
  isProduction: boolean;
}

export function getMidtransPublicConfig(): MidtransConfigState {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  return {
    configured: Boolean(serverKey && clientKey),
    clientKey,
    isProduction,
  };
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  if (!serverKey || !params.signatureKey) return false;
  const payload = `${params.orderId}${params.statusCode}${params.grossAmount}${serverKey}`;
  const expected = crypto.createHash('sha512').update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signatureKey));
  } catch {
    return false;
  }
}

export async function createMidtransSnapSession(order: Order): Promise<{
  mode: 'midtrans_sandbox' | 'midtrans_production' | 'sandbox_simulation';
  token: string;
  redirectUrl: string | null;
}> {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    return {
      mode: 'sandbox_simulation',
      token: `SIM-SNAP-${order.orderNumber}`,
      redirectUrl: null,
    };
  }

  const endpoint = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const auth = Buffer.from(`${serverKey}:`).toString('base64');
  const itemDetails = order.items.map((item) => ({
    id: item.sku,
    price: Math.round(item.unitPrice),
    quantity: item.quantity,
    name: item.name.slice(0, 50),
  }));

  if (order.shippingAmount > 0) {
    itemDetails.push({
      id: `SHIP-${order.courierCode}`,
      price: Math.round(order.shippingAmount),
      quantity: 1,
      name: `Pengiriman ${order.courierService}`.slice(0, 50),
    });
  }

  if (order.discountAmount > 0) {
    itemDetails.push({
      id: 'DISCOUNT',
      price: -Math.round(order.discountAmount),
      quantity: 1,
      name: `Diskon Kupon ${order.couponCode || ''}`.trim().slice(0, 50),
    });
  }

  const body = {
    transaction_details: {
      order_id: order.orderNumber,
      gross_amount: Math.round(order.grandTotal),
    },
    item_details: itemDetails,
    customer_details: {
      first_name: order.customerName.slice(0, 50),
      email: order.customerEmail,
      phone: order.customerPhone,
      shipping_address: {
        first_name: order.shippingAddressSnapshot.recipientName.slice(0, 50),
        phone: order.shippingAddressSnapshot.phone,
        address: order.shippingAddressSnapshot.addressLine.slice(0, 200),
        city: order.shippingAddressSnapshot.city,
        postal_code: order.shippingAddressSnapshot.postalCode,
        country_code: 'IDN',
      },
    },
    expiry: {
      unit: 'minutes',
      duration: 15,
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Midtrans Snap API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { token: string; redirect_url?: string };
  return {
    mode: isProduction ? 'midtrans_production' : 'midtrans_sandbox',
    token: data.token,
    redirectUrl: data.redirect_url || null,
  };
}

export async function fetchMidtransTransactionStatus(orderNumber: string): Promise<{
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  status_code?: string;
} | null> {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  if (!serverKey) return null;

  const baseUrl = isProduction
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
  const auth = Buffer.from(`${serverKey}:`).toString('base64');

  const res = await fetch(`${baseUrl}/v2/${encodeURIComponent(orderNumber)}/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) return null;
  return (await res.json()) as {
    transaction_status: string;
    fraud_status?: string;
    payment_type?: string;
    transaction_id?: string;
    status_code?: string;
  };
}
