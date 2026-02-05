import { RateRequest, RateResponse } from "../core/types";
import { CarrierRegistry } from "./carrierRegistry";
import { CarrierCode } from "./types";
import { createValidationError } from "../core/errors";

export interface ShippingService {
  getRates(carrier: CarrierCode, request: RateRequest): Promise<RateResponse>;
}

export const createShippingService = (registry: CarrierRegistry): ShippingService => {
  const getRates = async (carrier: CarrierCode, request: RateRequest): Promise<RateResponse> => {
    const adapter = registry.get(carrier);
    if (!adapter.rateService) {
      throw createValidationError(`Carrier does not support rate shopping: ${carrier}`);
    }
    return adapter.rateService.getRates(request);
  };

  return { getRates };
};
