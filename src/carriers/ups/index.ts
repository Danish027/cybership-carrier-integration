import { CarrierAdapter } from "../../services/types";
import { HttpClient } from "../../core/http";
import { UpsConfig } from "../../config";
import { createUpsOAuthClient, Clock } from "./auth";
import { createUpsRateService } from "./upsRateService";

export const createUpsAdapter = (
  httpClient: HttpClient,
  config: UpsConfig,
  clock?: Clock
): CarrierAdapter => {
  const authClient = createUpsOAuthClient(httpClient, config, clock);
  const rateService = createUpsRateService(httpClient, authClient, config);

  return {
    carrier: "UPS",
    rateService
  };
};
