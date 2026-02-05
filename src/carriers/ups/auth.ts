import { HttpClient, isHttpNetworkError, isHttpTimeoutError } from "../../core/http";
import { UpsTokenResponseSchema } from "./types";
import {
  createAuthError,
  createHttpError,
  createMalformedResponseError,
  createNetworkError,
  createTimeoutError,
  isAppError
} from "../../core/errors";
import { UpsConfig } from "../../config";

export interface Clock {
  now(): number;
}

export const createSystemClock = (): Clock => ({
  now: () => Date.now()
});

export interface UpsOAuthClient {
  getAccessToken(): Promise<string>;
}

export const createUpsOAuthClient = (
  httpClient: HttpClient,
  config: UpsConfig,
  clock: Clock = createSystemClock()
): UpsOAuthClient => {
  let cachedToken: { token: string; expiresAt: number } | undefined;
  const safetyWindowMs = 30_000;

  const requestToken = async () => {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "client_credentials"
    }).toString();

    try {
      const response = await httpClient.request({
        method: "POST",
        url: config.oauthUrl,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`
        },
        body,
        timeoutMs: config.timeoutMs
      });

      if (response.status >= 400) {
        throw createAuthError("UPS OAuth request failed", {
          status: response.status,
          details: { body: response.body }
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.body);
      } catch (error) {
        throw createMalformedResponseError("UPS OAuth response was not valid JSON", { cause: error });
      }

      const result = UpsTokenResponseSchema.safeParse(parsed);
      if (!result.success) {
        throw createMalformedResponseError("UPS OAuth response did not match expected schema", {
          details: { issues: result.error.issues }
        });
      }

      return result.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      if (isHttpTimeoutError(error)) {
        throw createTimeoutError("UPS OAuth request timed out", { cause: error });
      }
      if (isHttpNetworkError(error)) {
        throw createNetworkError("UPS OAuth network error", { cause: error });
      }
      if (error instanceof Error) {
        throw createHttpError("UPS OAuth request failed", { cause: error });
      }
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string> => {
    if (cachedToken && clock.now() < cachedToken.expiresAt - safetyWindowMs) {
      return cachedToken.token;
    }

    const tokenResponse = await requestToken();
    const expiresAt = clock.now() + tokenResponse.expires_in * 1000;
    cachedToken = { token: tokenResponse.access_token, expiresAt };
    return tokenResponse.access_token;
  };

  return { getAccessToken };
};
