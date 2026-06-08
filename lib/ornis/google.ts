import { ORNIS_SHEET_ID } from "./catalog";
import { requireEnv, type RuntimeEnv } from "./env";
import type { CheckoutOrder, FiuuPaymentUpdate } from "./order";
import { orderToSheetRow } from "./order";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
};

type ExistingOrderRow = {
  rowNumber: number;
  values: string[];
};

type SheetMetadata = {
  sheets?: {
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }[];
};

let cachedToken: { value: string; expiresAt: number } | null = null;

const getGoogleAccessToken = async (env: RuntimeEnv) => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv(env, "GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: requireEnv(env, "GOOGLE_WORKSPACE_OAUTH_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth refresh failed with ${response.status}.`);
  }

  const token = (await response.json()) as GoogleTokenResponse;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };

  return cachedToken.value;
};

const sheetsRequest = async (env: RuntimeEnv, path: string, init: RequestInit = {}) => {
  const accessToken = await getGoogleAccessToken(env);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID ?? ORNIS_SHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets request failed with ${response.status}.`);
  }

  return response.json();
};

const getOrdersSheetId = async (env: RuntimeEnv) => {
  const metadata = (await sheetsRequest(env, "?fields=sheets(properties(sheetId,title))")) as SheetMetadata;
  const ordersSheetId = metadata.sheets?.find((sheet) => sheet.properties?.title === "Orders")?.properties?.sheetId;

  if (ordersSheetId === undefined) {
    throw new Error("Orders sheet was not found.");
  }

  return ordersSheetId;
};

const applyPaymentStatusDropdown = async (env: RuntimeEnv, rowNumber: number) => {
  const ordersSheetId = await getOrdersSheetId(env);

  await sheetsRequest(env, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: ordersSheetId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: 3,
              endColumnIndex: 4,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "Paid" },
                  { userEnteredValue: "Pending" },
                  { userEnteredValue: "Failed" },
                ],
              },
              strict: true,
              showCustomUi: true,
            },
          },
        },
      ],
    }),
  });
};

export const appendPendingOrder = async (env: RuntimeEnv, order: CheckoutOrder) => {
  await sheetsRequest(env, "/values/Orders!A:X:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS", {
    method: "POST",
    body: JSON.stringify({
      values: [orderToSheetRow(order, "Pending")],
    }),
  });

  const existing = await findOrderRow(env, order.orderId);
  if (existing) await applyPaymentStatusDropdown(env, existing.rowNumber);
};

export const findOrderRow = async (env: RuntimeEnv, orderId: string): Promise<ExistingOrderRow | null> => {
  const data = await sheetsRequest(env, "/values/Orders!A:X?majorDimension=ROWS");
  const rows = (data.values ?? []) as string[][];
  const index = rows.findIndex((row) => row[0] === orderId);

  if (index < 0) return null;

  return {
    rowNumber: index + 1,
    values: rows[index],
  };
};

export const updateOrderPayment = async (
  env: RuntimeEnv,
  order: CheckoutOrder,
  payment: FiuuPaymentUpdate,
  sellerEmailSent: string,
) => {
  const existing = await findOrderRow(env, order.orderId);
  const row = orderToSheetRow(order, payment.status, payment, sellerEmailSent);

  if (!existing) {
    await sheetsRequest(env, "/values/Orders!A:X:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS", {
      method: "POST",
      body: JSON.stringify({ values: [row] }),
    });
    const appended = await findOrderRow(env, order.orderId);
    if (appended) await applyPaymentStatusDropdown(env, appended.rowNumber);
    return;
  }

  await sheetsRequest(env, `/values/Orders!A${existing.rowNumber}:X${existing.rowNumber}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ values: [row] }),
  });
  await applyPaymentStatusDropdown(env, existing.rowNumber);
};
