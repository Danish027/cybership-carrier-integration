import { RateRequest, RateResponse } from "../core/types";

export type CarrierCode = "UPS";

export interface RateService {
  getRates(request: RateRequest): Promise<RateResponse>;
}

export interface CarrierAdapter {
  carrier: CarrierCode;
  rateService?: RateService;
}
