import { CarrierAdapter, CarrierCode } from "./types";
import { createValidationError } from "../core/errors";

export interface CarrierRegistry {
  register(adapter: CarrierAdapter): void;
  get(carrier: CarrierCode): CarrierAdapter;
}

export const createCarrierRegistry = (): CarrierRegistry => {
  const adapters = new Map<CarrierCode, CarrierAdapter>();

  const register = (adapter: CarrierAdapter): void => {
    adapters.set(adapter.carrier, adapter);
  };

  const get = (carrier: CarrierCode): CarrierAdapter => {
    const adapter = adapters.get(carrier);
    if (!adapter) {
      throw createValidationError(`Carrier not registered: ${carrier}`);
    }
    return adapter;
  };

  return { register, get };
};
