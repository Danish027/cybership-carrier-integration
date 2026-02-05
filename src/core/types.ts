export type WeightUnit = "LBS" | "KGS";
export type DimensionUnit = "IN" | "CM";

export interface Address {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: DimensionUnit;
}

export interface PackageWeight {
  value: number;
  unit: WeightUnit;
}

export interface Package {
  weight: PackageWeight;
  dimensions?: PackageDimensions;
}

export interface RateRequest {
  shipper: Address;
  shipFrom?: Address;
  shipTo: Address;
  packages: Package[];
  serviceCode?: string;
}

export interface Money {
  amount: string;
  currency: string;
}

export interface RateQuote {
  carrier: "UPS";
  serviceCode: string;
  serviceName?: string;
  totalCharge: Money;
  deliveryDays?: number;
}

export interface RateResponse {
  quotes: RateQuote[];
}
