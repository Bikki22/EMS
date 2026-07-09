/**
 * Khalti ePayment API v2 client.
 * Docs: https://docs.khalti.com/khalti-epayment/
 *
 * Sandbox base URL: https://a.khalti.com/api/v2
 * Production base URL: https://khalti.com/api/v2
 */

const BASE_URL = (
  process.env.KHALTI_BASE_URL || "https://a.khalti.com/api/v2"
).replace(/\/$/, "");
const SECRET_KEY = process.env.KHALTI_SECRET_KEY || "";

const authHeaders = () => {
  if (!SECRET_KEY) {
    throw new Error("KHALTI_SECRET_KEY is not configured");
  }
  return {
    Authorization: `Key ${SECRET_KEY}`,
    "Content-Type": "application/json",
  };
};

export interface KhaltiInitiateParams {
  returnUrl: string;
  websiteUrl: string;
  amountPaisa: number; // amount in paisa (NPR * 100)
  purchaseOrderId: string;
  purchaseOrderName: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number; // paisa
  status:
    | "Completed"
    | "Pending"
    | "Initiated"
    | "Refunded"
    | "Expired"
    | "User canceled";
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
}

export const khaltiInitiate = async (
  params: KhaltiInitiateParams,
): Promise<KhaltiInitiateResponse> => {
  const res = await fetch(`${BASE_URL}/epayment/initiate/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      return_url: params.returnUrl,
      website_url: params.websiteUrl,
      amount: params.amountPaisa,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      ...(params.customerInfo ? { customer_info: params.customerInfo } : {}),
    }),
  });

  const data = (await res.json()) as unknown;
  if (!res.ok) {
    const message =
      (data as { detail?: string })?.detail ||
      `Khalti initiate failed (${res.status})`;
    throw new Error(message);
  }

  return data as KhaltiInitiateResponse;
};

export const khaltiLookup = async (
  pidx: string,
): Promise<KhaltiLookupResponse> => {
  const res = await fetch(`${BASE_URL}/epayment/lookup/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ pidx }),
  });

  const data = (await res.json()) as unknown;
  if (!res.ok) {
    const message =
      (data as { detail?: string })?.detail ||
      `Khalti lookup failed (${res.status})`;
    throw new Error(message);
  }

  return data as KhaltiLookupResponse;
};
