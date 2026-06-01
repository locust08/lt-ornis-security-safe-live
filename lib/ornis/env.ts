type RuntimeEnvSource = Record<string, string | undefined>;

export type RuntimeEnv = RuntimeEnvSource & {
  FIUU_MODE?: string;
  FIUU_MERCHANT_ID?: string;
  FIUU_VERIFY_KEY?: string;
  FIUU_SECRET_KEY?: string;
  FIUU_PAYMENT_BASE_URL?: string;
  FIUU_IPN_ACK_URL?: string;
  FIUU_EXTENDED_VCODE?: string;
  GOOGLE_SHEET_ID?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_WORKSPACE_OAUTH_REFRESH_TOKEN?: string;
  SELLER_NOTIFICATION_EMAIL?: string;
  SELLER_NOTIFICATION_CC?: string;
  GMAIL_FROM_EMAIL?: string;
  META_PIXEL_ID?: string;
  PUBLIC_META_PIXEL_ID?: string;
};

const readProcessEnv = (): RuntimeEnvSource => {
  const maybeProcess = (globalThis as typeof globalThis & { process?: { env?: RuntimeEnvSource } }).process;
  return maybeProcess?.env ?? {};
};

export const getRuntimeEnv = (context?: { locals?: unknown }): RuntimeEnv => {
  const locals = context?.locals as { runtime?: { env?: RuntimeEnvSource } } | undefined;

  return {
    ...import.meta.env,
    ...readProcessEnv(),
    ...(locals?.runtime?.env ?? {}),
  };
};

export const requireEnv = (env: RuntimeEnv, name: keyof RuntimeEnv) => {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};
