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
import { createHmac } from "node:crypto";

const FORM_URL =
  process.env.ESEWA_FORM_URL ||
  "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const STATUS_URL = (
  process.env.ESEWA_STATUS_URL ||
  "https://rc.esewa.com.np/api/epay/transaction/status/"
).replace(/\/$/, "");
const PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";

/** Build the HMAC-SHA256 (base64) signature over the signed field values. */
export const esewaSignature = (
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
): string => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return createHmac("sha256", SECRET_KEY).update(message).digest("base64");
};

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
  const amount = params.amount.toString();
  const totalAmount = params.amount.toString();
  const signature = esewaSignature(
    totalAmount,
    params.transactionUuid,
    PRODUCT_CODE,
  );

  return {
    method: "POST",
    formUrl: FORM_URL,
    fields: {
      amount,
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
  const json = Buffer.from(base64Data, "base64").toString("utf-8");
  return JSON.parse(json) as EsewaCallbackData;
};

/** Verify the signature returned in the callback payload. */
export const esewaVerifyCallbackSignature = (
  data: EsewaCallbackData,
): boolean => {
  const message = data.signed_field_names
    .split(",")
    .map(
      (field) =>
        `${field}=${(data as unknown as Record<string, string>)[field]}`,
    )
    .join(",");
  const expected = createHmac("sha256", SECRET_KEY)
    .update(message)
    .digest("base64");
  return expected === data.signature;
};

export interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number;
  status: string; // COMPLETE, PENDING, CANCELED, NOT_FOUND, AMBIGUOUS
  ref_id: string | null;
}

/** Server-to-server verification of a transaction's final status. */
export const esewaCheckStatus = async (params: {
  totalAmount: number;
  transactionUuid: string;
}): Promise<EsewaStatusResponse> => {
  const url = `${STATUS_URL}/?product_code=${encodeURIComponent(
    PRODUCT_CODE,
  )}&total_amount=${params.totalAmount}&transaction_uuid=${encodeURIComponent(
    params.transactionUuid,
  )}`;

  const res = await fetch(url);
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    throw new Error(`eSewa status check failed (${res.status})`);
  }
  return data as EsewaStatusResponse;
};
