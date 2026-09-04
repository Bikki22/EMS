/**
 * eSewa ePay v2 client.
 * Docs: https://developer.esewa.com.np/pages/Epay#integration
 *
 * The payer's browser submits a signed form to the eSewa form URL. After
 * payment eSewa redirects to success_url with a base64 `data` param, which we
 * decode and then re-verify against the transaction status API.
 *
 * Test credentials: product_code = EPAYTEST, secret = 8gBm/:&EnhH.1/q
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

const FORM_URL =
  env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const STATUS_URL = (
  env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/"
).replace(/\/$/, "");
const PRODUCT_CODE = env.ESEWA_PRODUCT_CODE || "EPAYTEST";

/** The sandbox secret is published in eSewa's docs — it signs nothing. */
const TEST_SECRET = "8gBm/:&EnhH.1/q";

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Falling back to the documented test secret in production would make the
 * callback signature forgeable by anyone who read the docs, and that
 * signature is the only thing standing between a stranger and a free
 * confirmed booking. Refuse to run rather than verify with a public key.
 */
const secretKey = (): string => {
  const configured = env.ESEWA_SECRET_KEY;
  if (!configured) {
    if (env.NODE_ENV === "production") {
      throw new Error("ESEWA_SECRET_KEY is not configured");
    }
    return TEST_SECRET;
  }
  return configured;
};

/** Build the HMAC-SHA256 (base64) signature over the signed field values. */
export const esewaSignature = (
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
): string => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return createHmac("sha256", secretKey()).update(message).digest("base64");
};

/**
 * eSewa formats amounts with thousands separators in some responses
 * ("1,000.0"). Number("1,000.0") is NaN, which silently turns every booking
 * of NPR 1000 or more into an "amount does not match" rejection.
 */
export const esewaParseAmount = (value: string | number): number => {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/,/g, "").trim());
};

/** eSewa settles in paisa; compare there rather than on binary floats. */
export const esewaAmountsMatch = (a: number, b: number): boolean =>
  Number.isFinite(a) &&
  Number.isFinite(b) &&
  Math.round(a * 100) === Math.round(b * 100);

/**
 * The amount string sent to eSewa. Whole rupees stay whole (that is the form
 * eSewa documents), and a fractional amount is pinned to two decimals so
 * `0.1 + 0.2` cannot reach the wire as "0.30000000000000004" — which would be
 * signed, sent, and then rejected as a mismatch.
 */
export const esewaFormatAmount = (amount: number): string =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

export interface EsewaFormFields {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaFormPayload {
  method: "POST";
  formUrl: string;
  fields: EsewaFormFields;
}

export const esewaBuildForm = (params: {
  amount: number; // NPR rupees
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}): EsewaFormPayload => {
  // eSewa signs the exact string it is sent, so the amount is formatted once
  // and that same string is used for the field and for the signature.
  const totalAmount = esewaFormatAmount(params.amount);
  const signature = esewaSignature(
    totalAmount,
    params.transactionUuid,
    PRODUCT_CODE,
  );

  return {
    method: "POST",
    formUrl: FORM_URL,
    fields: {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: params.transactionUuid,
      product_code: PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    },
  };
};

export interface EsewaCallbackData {
  transaction_code: string;
  status: string; // COMPLETE, PENDING, FULL_REFUND, etc.
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

/** Decode the base64 `data` query param from the success redirect. */
export const esewaDecodeCallback = (base64Data: string): EsewaCallbackData => {
  let parsed: unknown;
  try {
    const json = Buffer.from(base64Data, "base64").toString("utf-8");
    parsed = JSON.parse(json);
  } catch {
    // The raw SyntaxError used to end up in the redirect the payer sees.
    throw new Error("Malformed eSewa callback payload");
  }

  const data = parsed as Partial<EsewaCallbackData> | null;
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.transaction_uuid !== "string" ||
    typeof data.product_code !== "string" ||
    typeof data.signed_field_names !== "string" ||
    typeof data.signature !== "string"
  ) {
    throw new Error("Incomplete eSewa callback payload");
  }

  return data as EsewaCallbackData;
};

/** Constant-time compare of two base64 signatures. */
const signaturesEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "base64");
  const right = Buffer.from(b, "base64");
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
};

// A signature only means something if it covers the fields the decision is
// made on. Trusting whatever `signed_field_names` names would accept a
// payload signed over nothing that matters.
const REQUIRED_SIGNED_FIELDS = [
  "total_amount",
  "transaction_uuid",
  "product_code",
] as const;

/** Verify the signature returned in the callback payload. */
export const esewaVerifyCallbackSignature = (
  data: EsewaCallbackData,
): boolean => {
  if (data.product_code !== PRODUCT_CODE) {
    return false;
  }

  const signedFields = data.signed_field_names.split(",").map((f) => f.trim());
  if (!REQUIRED_SIGNED_FIELDS.every((f) => signedFields.includes(f))) {
    return false;
  }

  const record = data as unknown as Record<string, unknown>;
  if (signedFields.some((f) => typeof record[f] !== "string")) {
    return false;
  }

  const message = signedFields.map((f) => `${f}=${record[f]}`).join(",");
  const expected = createHmac("sha256", secretKey())
    .update(message)
    .digest("base64");

  return signaturesEqual(expected, data.signature);
};

export interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number | string;
  status: string; // COMPLETE, PENDING, CANCELED, NOT_FOUND, AMBIGUOUS
  ref_id: string | null;
}

/** Server-to-server verification of a transaction's final status. */
export const esewaCheckStatus = async (params: {
  totalAmount: number;
  transactionUuid: string;
}): Promise<EsewaStatusResponse> => {
  secretKey(); // fail fast on an unconfigured production deployment

  const url = `${STATUS_URL}/?product_code=${encodeURIComponent(
    PRODUCT_CODE,
  )}&total_amount=${encodeURIComponent(
    esewaFormatAmount(params.totalAmount),
  )}&transaction_uuid=${encodeURIComponent(params.transactionUuid)}`;

  let res: Response;
  try {
    // Without a deadline an unresponsive eSewa holds the callback request
    // open until the payer's browser gives up on a blank tab.
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new Error(
      err instanceof Error && err.name === "TimeoutError"
        ? "eSewa status check timed out"
        : "Could not reach eSewa to verify the transaction",
    );
  }

  // A gateway error page is not JSON; res.json() threw a parser error that
  // read like a bug in our own code.
  const body = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(
      `eSewa status check returned a non-JSON response (${res.status})`,
    );
  }

  if (!res.ok) {
    throw new Error(`eSewa status check failed (${res.status})`);
  }

  return data as EsewaStatusResponse;
};
