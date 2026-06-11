import { ORNIS_SHEET_ID } from "./catalog";
import { requireEnv, type RuntimeEnv } from "./env";
import type { CheckoutOrder, FiuuPaymentUpdate } from "./order";
import { orderToSheetRow } from "./order";
import { PRE_PAYMENT_INFO_COLUMNS, prePaymentLeadToSheetRow, type PrePaymentLead } from "./pre-payment";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
};

type ExistingOrderRow = {
  rowNumber: number;
  values: string[];
};

type ExistingPrePaymentRow = ExistingOrderRow;

type SheetMetadata = {
  sheets?: {
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }[];
};

let cachedToken: { value: string; expiresAt: number } | null = null;
const PRE_PAYMENT_INFO_SHEET_TITLE = "Pre Payment Info";
const PRE_PAYMENT_INFO_FALLBACK_TITLE = "Info Tracker";
const PRE_PAYMENT_INFO_SHEET_ID = 1224555452;

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
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Sheets request failed with ${response.status}: ${detail.slice(0, 500)}`);
  }

  return response.json();
};

const encodeSheetRange = (range: string) => encodeURIComponent(range).replace(/'/g, "%27");

const getOrdersSheetId = async (env: RuntimeEnv) => {
  const metadata = (await sheetsRequest(env, "?fields=sheets(properties(sheetId,title))")) as SheetMetadata;
  const ordersSheetId = metadata.sheets?.find((sheet) => sheet.properties?.title === "Orders")?.properties?.sheetId;

  if (ordersSheetId === undefined) {
    throw new Error("Orders sheet was not found.");
  }

  return ordersSheetId;
};

const getPrePaymentInfoSheet = async (env: RuntimeEnv) => {
  const metadata = (await sheetsRequest(env, "?fields=sheets(properties(sheetId,title))")) as SheetMetadata;
  const sheets = metadata.sheets ?? [];
  const sheet =
    sheets.find((item) => item.properties?.title === PRE_PAYMENT_INFO_SHEET_TITLE) ??
    sheets.find((item) => item.properties?.sheetId === PRE_PAYMENT_INFO_SHEET_ID) ??
    sheets.find((item) => item.properties?.title === PRE_PAYMENT_INFO_FALLBACK_TITLE);

  if (!sheet?.properties?.title || sheet.properties.sheetId === undefined) {
    throw new Error(`${PRE_PAYMENT_INFO_SHEET_TITLE} sheet was not found.`);
  }

  return {
    sheetId: sheet.properties.sheetId,
    title: sheet.properties.title,
  };
};

const normalizeSheetRow = (row: unknown[]) => row.map((value) => String(value ?? ""));

const ensurePrePaymentHeaders = async (env: RuntimeEnv) => {
  const sheet = await getPrePaymentInfoSheet(env);
  const headerRange = `'${sheet.title}'!A1:AD1`;
  const data = await sheetsRequest(env, `/values/${encodeSheetRange(headerRange)}?majorDimension=ROWS`);
  const existingHeader = normalizeSheetRow(((data.values ?? []) as unknown[][])[0] ?? []);
  const expectedHeader = [...PRE_PAYMENT_INFO_COLUMNS];

  if (expectedHeader.every((column, index) => existingHeader[index] === column)) return;

  await sheetsRequest(env, `/values/${encodeSheetRange(headerRange)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [expectedHeader] }),
  });
};

const applyPrePaymentRowFormatting = async (env: RuntimeEnv, rowNumber: number) => {
  const { sheetId } = await getPrePaymentInfoSheet(env);

  await sheetsRequest(env, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: 2,
              endColumnIndex: 3,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "Draft" },
                  { userEnteredValue: "Form Complete" },
                  { userEnteredValue: "Submitted to Fiuu" },
                  { userEnteredValue: "Paid" },
                  { userEnteredValue: "Failed" },
                  { userEnteredValue: "Cancelled" },
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

const applyOrderRowFormatting = async (env: RuntimeEnv, rowNumber: number) => {
  const ordersSheetId = await getOrdersSheetId(env);

  await sheetsRequest(env, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: ordersSheetId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: 1,
              endColumnIndex: 2,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: "DATE",
                  pattern: "yyyy-mm-dd",
                },
              },
            },
            fields: "userEnteredFormat.numberFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: ordersSheetId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: 2,
              endColumnIndex: 3,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: "TIME",
                  pattern: "hh:mmAM/PM",
                },
              },
            },
            fields: "userEnteredFormat.numberFormat",
          },
        },
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

const moveDataRowToTop = async (env: RuntimeEnv, sheetId: number, existingRowNumber?: number | null) => {
  if (existingRowNumber === 2) return;

  const requests = [];

  if (existingRowNumber && existingRowNumber > 2) {
    requests.push({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: existingRowNumber - 1,
          endIndex: existingRowNumber,
        },
      },
    });
  }

  requests.push({
    insertDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: 1,
        endIndex: 2,
      },
      inheritFromBefore: false,
    },
  });

  await sheetsRequest(env, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
};

export const appendPendingOrder = async (env: RuntimeEnv, order: CheckoutOrder) => {
  await sheetsRequest(env, "/values/Orders!A:X:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", {
    method: "POST",
    body: JSON.stringify({ values: [orderToSheetRow(order, "Pending")] }),
  });
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
  const ordersSheetId = await getOrdersSheetId(env);

  await moveDataRowToTop(env, ordersSheetId, existing?.rowNumber);
  await sheetsRequest(env, "/values/Orders!A2:X2?valueInputOption=RAW", {
    method: "PUT",
    body: JSON.stringify({ values: [row] }),
  });
  await applyOrderRowFormatting(env, 2);
};

export const findPrePaymentInfoRow = async (env: RuntimeEnv, draftId: string): Promise<ExistingPrePaymentRow | null> => {
  await ensurePrePaymentHeaders(env);

  const sheet = await getPrePaymentInfoSheet(env);
  const data = await sheetsRequest(env, `/values/${encodeSheetRange(`'${sheet.title}'!A:AD`)}?majorDimension=ROWS`);
  const rows = (data.values ?? []) as string[][];
  const index = rows.findIndex((row, rowIndex) => rowIndex > 0 && row[0] === draftId);

  if (index < 0) return null;

  return {
    rowNumber: index + 1,
    values: rows[index],
  };
};

export const upsertPrePaymentInfo = async (env: RuntimeEnv, lead: PrePaymentLead) => {
  await ensurePrePaymentHeaders(env);

  const existing = await findPrePaymentInfoRow(env, lead.draftId);
  const row = prePaymentLeadToSheetRow(lead);
  const sheet = await getPrePaymentInfoSheet(env);

  await moveDataRowToTop(env, sheet.sheetId, existing?.rowNumber);
  const rowRange = encodeSheetRange(`'${sheet.title}'!A2:AD2`);
  await sheetsRequest(env, `/values/${rowRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [row] }),
  });
  await applyPrePaymentRowFormatting(env, 2);
};
