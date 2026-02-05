import { createValidationError } from "./core/errors";

export interface UpsConfig {
  clientId: string;
  clientSecret: string;
  oauthUrl: string;
  rateUrl: string;
  accountNumber?: string;
  timeoutMs: number;
}

export interface AppConfig {
  ups: UpsConfig;
}

const getEnv = (key: string, required = true): string | undefined => {
  const value = process.env[key];
  if (required && (!value || value.trim().length === 0)) {
    throw createValidationError(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw createValidationError(`Invalid number for environment variable: ${key}`);
  }
  return parsed;
};

export const loadConfig = (): AppConfig => ({
  ups: {
    clientId: getEnv("UPS_CLIENT_ID")!,
    clientSecret: getEnv("UPS_CLIENT_SECRET")!,
    oauthUrl: getEnv("UPS_OAUTH_URL")!,
    rateUrl: getEnv("UPS_RATE_URL")!,
    accountNumber: getEnv("UPS_ACCOUNT_NUMBER", false),
    timeoutMs: getEnvNumber("UPS_TIMEOUT_MS", 10000)
  }
});
