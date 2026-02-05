import { HttpClient, isHttpNetworkError, isHttpTimeoutError } from "../../core/http";
import { RateRequest, RateResponse } from "../../core/types";
import { RateRequestSchema } from "../../core/validation";
import {
  createAuthError,
  createCarrierError,
  createHttpError,
  createMalformedResponseError,
  createNetworkError,
  createRateLimitError,
  createTimeoutError,
  createValidationError,
  isAppError
} from "../../core/errors";
import { UpsConfig } from "../../config";
import { buildUpsRateRequest, parseUpsRateResponse } from "./rateMapper";
import { UpsOAuthClient } from "./auth";
import { UpsErrorSchema } from "./types";

const extractUpsError = (body: string): { code?: string; message?: string } | undefined => {
  try {
    const parsed = JSON.parse(body);
    const result = UpsErrorSchema.safeParse(parsed);
    if (!result.success) {
      return undefined;
    }

    const responseErrors = result.data.response?.errors?.[0];
    if (responseErrors) {
      return { code: responseErrors.code, message: responseErrors.message };
    }

    const faultError = result.data.Fault?.detail?.Errors?.ErrorDetail?.PrimaryErrorCode;
    if (faultError) {
      return { code: faultError.Code, message: faultError.Description };
    }
  } catch (error) {
    return undefined;
  }

  return undefined;
};

export interface UpsRateService {
  getRates(request: RateRequest): Promise<RateResponse>;
}

export const createUpsRateService = (
  httpClient: HttpClient,
  authClient: UpsOAuthClient,
  config: UpsConfig
): UpsRateService => {
  const getRates = async (request: RateRequest): Promise<RateResponse> => {
    const validation = RateRequestSchema.safeParse(request);
    if (!validation.success) {
      throw createValidationError("Rate request validation failed", { issues: validation.error.issues });
    }

    const token = await authClient.getAccessToken();
    const upsPayload = buildUpsRateRequest(request, config.accountNumber);

    try {
      const response = await httpClient.request({
        method: "POST",
        url: config.rateUrl,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(upsPayload),
        timeoutMs: config.timeoutMs
      });

      if (response.status === 401 || response.status === 403) {
        throw createAuthError("UPS rate request unauthorized", {
          status: response.status,
          details: { body: response.body }
        });
      }

      if (response.status === 429) {
        throw createRateLimitError("UPS rate request rate limited", {
          status: response.status,
          details: { body: response.body }
        });
      }

      if (response.status >= 400) {
        const upsError = extractUpsError(response.body);
        throw createCarrierError("UPS rate request failed", {
          status: response.status,
          details: { upsError, body: response.body }
        });
      }

      return parseUpsRateResponse(response.body);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      if (isHttpTimeoutError(error)) {
        throw createTimeoutError("UPS rate request timed out", { cause: error });
      }
      if (isHttpNetworkError(error)) {
        throw createNetworkError("UPS rate request network error", { cause: error });
      }
      if (error instanceof Error) {
        throw createHttpError("UPS rate request failed", { cause: error });
      }
      throw error;
    }
  };

  return { getRates };
};
