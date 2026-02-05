import { RateQuote, RateRequest, RateResponse } from "../../core/types";
import { UpsRateResponseSchema } from "./types";
import { createMalformedResponseError } from "../../core/errors";

const SERVICE_NAME_BY_CODE: Record<string, string> = {
  "01": "UPS Next Day Air",
  "02": "UPS 2nd Day Air",
  "03": "UPS Ground",
  "12": "UPS 3 Day Select",
  "13": "UPS Next Day Air Saver",
  "14": "UPS Next Day Air Early",
  "59": "UPS 2nd Day Air AM",
  "65": "UPS Saver"
};

const mapAddress = (address: RateRequest["shipper"]) => ({
  Address: {
    AddressLine: address.address2 ? [address.address1, address.address2] : [address.address1],
    City: address.city,
    StateProvinceCode: address.state,
    PostalCode: address.postalCode,
    CountryCode: address.countryCode
  },
  Name: address.name || address.company
});

const mapPackage = (pkg: RateRequest["packages"][number]) => ({
  PackagingType: {
    Code: "02"
  },
  Dimensions: pkg.dimensions
    ? {
        UnitOfMeasurement: { Code: pkg.dimensions.unit },
        Length: pkg.dimensions.length.toString(),
        Width: pkg.dimensions.width.toString(),
        Height: pkg.dimensions.height.toString()
      }
    : undefined,
  PackageWeight: {
    UnitOfMeasurement: { Code: pkg.weight.unit },
    Weight: pkg.weight.value.toString()
  }
});

export const buildUpsRateRequest = (request: RateRequest, accountNumber?: string) => {
  const shipFrom = request.shipFrom ?? request.shipper;

  return {
    RateRequest: {
      Request: {
        RequestOption: "Rate"
      },
      Shipment: {
        Shipper: {
          ...mapAddress(request.shipper),
          ShipperNumber: accountNumber
        },
        ShipTo: mapAddress(request.shipTo),
        ShipFrom: mapAddress(shipFrom),
        Package: request.packages.map(mapPackage),
        Service: request.serviceCode ? { Code: request.serviceCode } : undefined
      }
    }
  };
};

export const parseUpsRateResponse = (body: string): RateResponse => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw createMalformedResponseError("UPS rate response was not valid JSON", { cause: error });
  }

  const result = UpsRateResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw createMalformedResponseError("UPS rate response did not match expected schema", {
      details: { issues: result.error.issues }
    });
  }

  const ratedShipments = Array.isArray(result.data.RateResponse.RatedShipment)
    ? result.data.RateResponse.RatedShipment
    : [result.data.RateResponse.RatedShipment];

  const quotes: RateQuote[] = ratedShipments.map((shipment) => ({
    carrier: "UPS",
    serviceCode: shipment.Service.Code,
    serviceName: SERVICE_NAME_BY_CODE[shipment.Service.Code],
    totalCharge: {
      amount: shipment.TotalCharges.MonetaryValue,
      currency: shipment.TotalCharges.CurrencyCode
    },
    deliveryDays: shipment.GuaranteedDelivery?.BusinessDaysInTransit
      ? Number(shipment.GuaranteedDelivery.BusinessDaysInTransit)
      : undefined
  }));

  return { quotes };
};
