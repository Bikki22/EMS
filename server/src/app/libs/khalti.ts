/**
 * Khalti ePayment API v2 client.
 * Docs: https://docs.khalti.com/khalti-epayment/
 *
 * Sandbox base URL: https://a.khalti.com/api/v2
 * Production base URL: https://khalti.com/api/v2
 */
import { env } from "../config/env";

const BASE_URL = (
  env.KHALTI_BASE_URL || "https://a.khalti.com/api/v2"
).replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = 15_000;

/** Khalti rejects anything under Rs 10. */
export const KHALTI_MIN_PAISA = 1000;

const authHeaders = () => {
  const secret = env.KHALTI_SECRET_KEY;
  if (!secret) {
    throw new Error("KHALTI_SECRET_KEY is not configured");
  }
  return {
    Authorization: `Key ${secret}`,
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

export type KhaltiStatus =
  | "Completed"
  | "Pending"
  | "Initiated"
  | "Refunded"
  | "Expired"
  | "User canceled";

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number; // paisa
  status: KhaltiStatus;
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
}

/**
 * Khalti answers errors with a JSON body, but a gateway or WAF in front of it
 * answers with HTML. res.json() threw a parser error there, which surfaced to
 * the payer as an unexplained failure instead of the provider's own message.
 */
const request = async (
  path: string,
  body: unknown,
  label: string,
): Promise<unknown> => {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      // An unbounded fetch leaves the caller's HTTP request hanging on a
      // provider that never answers.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`${label} timed out`);
    }
    if (err instanceof Error && err.message.includes("KHALTI_SECRET_KEY")) {
      throw err;
    }
    throw new Error(`Could not reach Khalti to ${label.toLowerCase()}`);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned a non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    const detail = data as Record<string, unknown> | null;
    const message =
      (typeof detail?.detail === "string" && detail.detail) ||
      // Field errors come back as { amount: ["..."] }.
      (detail &&
        Object.entries(detail)
          .map(([field, value]) =>
            Array.isArray(value) ? `${field}: ${value.join(", ")}` : null,
          )
          .filter(Boolean)
          .join("; ")) ||
      `${label} failed (${res.status})`;
    throw new Error(String(message));
  }

  return data;
};

export const khaltiInitiate = async (
  params: KhaltiInitiateParams,
): Promise<KhaltiInitiateResponse> => {
  const data = await request(
    "/epayment/initiate/",
    {
      return_url: params.returnUrl,
      website_url: params.websiteUrl,
      amount: params.amountPaisa,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      ...(params.customerInfo ? { customer_info: params.customerInfo } : {}),
    },
    "Khalti initiate",
  );

  const parsed = data as Partial<KhaltiInitiateResponse> | null;
  if (!parsed?.pidx || !parsed.payment_url) {
    throw new Error("Khalti initiate returned an unusable response");
  }

  return parsed as KhaltiInitiateResponse;
};

export const khaltiLookup = async (
  pidx: string,
): Promise<KhaltiLookupResponse> => {
  const data = await request("/epayment/lookup/", { pidx }, "Khalti lookup");

  const parsed = data as Partial<KhaltiLookupResponse> | null;
  if (!parsed?.status) {
    throw new Error("Khalti lookup returned an unusable response");
  }

  return parsed as KhaltiLookupResponse;
};
