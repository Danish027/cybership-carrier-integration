import { describe, expect, it } from "vitest";
import { createCarrierRegistry } from "../../src/services/carrierRegistry";
import { createShippingService } from "../../src/services/shippingService";
import { createUpsAdapter } from "../../src/carriers/ups";
import { HttpClient, HttpRequest, HttpResponse, createHttpTimeoutError } from "../../src/core/http";
import { RateRequest } from "../../src/core/types";
import { UpsConfig } from "../../src/config";
import { Clock } from "../../src/carriers/ups/auth";

const createStubHttpClient = () => {
  const requests: HttpRequest[] = [];
  const queue: Array<{ type: "response"; response: HttpResponse } | { type: "error"; error: Error }> = [];

  const enqueueResponse = (response: HttpResponse) => {
    queue.push({ type: "response", response });
  };

  const enqueueError = (error: Error) => {
    queue.push({ type: "error", error });
  };

  const request = async (request: HttpRequest): Promise<HttpResponse> => {
    requests.push(request);
    const next = queue.shift();
    if (!next) {
      throw new Error("No stubbed response available");
    }
    if (next.type === "error") {
      throw next.error;
    }
    return next.response;
  };

  return { requests, enqueueResponse, enqueueError, request } as const satisfies HttpClient & {
    requests: HttpRequest[];
    enqueueResponse: (response: HttpResponse) => void;
    enqueueError: (error: Error) => void;
  };
};

const createFakeClock = (startMs: number) => {
  let nowMs = startMs;
  const now = () => nowMs;
  const advanceBy = (ms: number) => {
    nowMs += ms;
  };
  return { now, advanceBy } as const satisfies Clock & { advanceBy: (ms: number) => void };
};

const baseConfig: UpsConfig = {
  clientId: "test-client",
  clientSecret: "test-secret",
  oauthUrl: "https://api.ups.com/oauth",
  rateUrl: "https://api.ups.com/rate",
  accountNumber: "A1B2C3",
  timeoutMs: 5000
};

const buildRegistry = (httpClient: HttpClient, clock: Clock) => {
  const registry = createCarrierRegistry();
  registry.register(createUpsAdapter(httpClient, baseConfig, clock));
  return registry;
};

const tokenResponse = {
  access_token: "token-123",
  token_type: "bearer",
  expires_in: 120
};

const rateResponsePayload = {
  RateResponse: {
    RatedShipment: [
      {
        Service: { Code: "03" },
        TotalCharges: { CurrencyCode: "USD", MonetaryValue: "12.34" },
        GuaranteedDelivery: { BusinessDaysInTransit: "3" }
      }
    ]
  }
};

const rateRequest: RateRequest = {
  shipper: {
    name: "Warehouse",
    address1: "123 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    countryCode: "US"
  },
  shipTo: {
    name: "Customer",
    address1: "500 Market St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    countryCode: "US"
  },
  packages: [
    {
      weight: { value: 2, unit: "LBS" },
      dimensions: { length: 10, width: 5, height: 4, unit: "IN" }
    }
  ],
  serviceCode: "03"
};

describe("UPS rate integration", () => {
  it("builds the UPS request and normalizes response", async () => {
    const httpClient = createStubHttpClient();
    const clock = createFakeClock(0);

    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(rateResponsePayload) });

    const shipping = createShippingService(buildRegistry(httpClient, clock));
    const result = await shipping.getRates("UPS", rateRequest);

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]).toMatchObject({
      carrier: "UPS",
      serviceCode: "03",
      totalCharge: { amount: "12.34", currency: "USD" },
      deliveryDays: 3
    });

    expect(httpClient.requests).toHaveLength(2);
    const rateCall = httpClient.requests[1];
    expect(rateCall.url).toBe(baseConfig.rateUrl);
    expect(rateCall.headers?.Authorization).toBe("Bearer token-123");

    const body = JSON.parse(rateCall.body ?? "{}");
    expect(body).toEqual({
      RateRequest: {
        Request: { RequestOption: "Rate" },
        Shipment: {
          Shipper: {
            Address: {
              AddressLine: ["123 Main St"],
              City: "Austin",
              StateProvinceCode: "TX",
              PostalCode: "78701",
              CountryCode: "US"
            },
            Name: "Warehouse",
            ShipperNumber: "A1B2C3"
          },
          ShipTo: {
            Address: {
              AddressLine: ["500 Market St"],
              City: "San Francisco",
              StateProvinceCode: "CA",
              PostalCode: "94105",
              CountryCode: "US"
            },
            Name: "Customer"
          },
          ShipFrom: {
            Address: {
              AddressLine: ["123 Main St"],
              City: "Austin",
              StateProvinceCode: "TX",
              PostalCode: "78701",
              CountryCode: "US"
            },
            Name: "Warehouse"
          },
          Package: [
            {
              PackagingType: { Code: "02" },
              Dimensions: {
                UnitOfMeasurement: { Code: "IN" },
                Length: "10",
                Width: "5",
                Height: "4"
              },
              PackageWeight: {
                UnitOfMeasurement: { Code: "LBS" },
                Weight: "2"
              }
            }
          ],
          Service: { Code: "03" }
        }
      }
    });
  });

  it("reuses and refreshes OAuth tokens", async () => {
    const httpClient = createStubHttpClient();
    const clock = createFakeClock(0);

    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(rateResponsePayload) });
    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(rateResponsePayload) });

    httpClient.enqueueResponse({
      status: 200,
      headers: {},
      body: JSON.stringify({ ...tokenResponse, access_token: "token-456" })
    });
    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(rateResponsePayload) });

    const shipping = createShippingService(buildRegistry(httpClient, clock));
    await shipping.getRates("UPS", rateRequest);
    await shipping.getRates("UPS", rateRequest);

    expect(httpClient.requests.filter((req) => req.url === baseConfig.oauthUrl)).toHaveLength(1);

    clock.advanceBy(121_000);
    await shipping.getRates("UPS", rateRequest);

    expect(httpClient.requests.filter((req) => req.url === baseConfig.oauthUrl)).toHaveLength(2);
    expect(httpClient.requests.filter((req) => req.url === baseConfig.rateUrl)).toHaveLength(3);
  });

  it("handles HTTP error responses", async () => {
    const httpClient = createStubHttpClient();
    const clock = createFakeClock(0);

    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient.enqueueResponse({
      status: 429,
      headers: {},
      body: JSON.stringify({ response: { errors: [{ code: "rate_limit", message: "Too many requests" }] } })
    });

    const shipping = createShippingService(buildRegistry(httpClient, clock));

    await expect(shipping.getRates("UPS", rateRequest)).rejects.toMatchObject({ code: "RATE_LIMITED" });

    const httpClient2 = createStubHttpClient();
    const clock2 = createFakeClock(0);
    httpClient2.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient2.enqueueResponse({ status: 500, headers: {}, body: "{\"error\":\"bad\"}" });

    const shipping2 = createShippingService(buildRegistry(httpClient2, clock2));
    await expect(shipping2.getRates("UPS", rateRequest)).rejects.toMatchObject({ code: "CARRIER_ERROR" });
  });

  it("handles malformed JSON responses", async () => {
    const httpClient = createStubHttpClient();
    const clock = createFakeClock(0);

    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient.enqueueResponse({ status: 200, headers: {}, body: "not-json" });

    const shipping = createShippingService(buildRegistry(httpClient, clock));

    await expect(shipping.getRates("UPS", rateRequest)).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });

  it("handles timeouts", async () => {
    const httpClient = createStubHttpClient();
    const clock = createFakeClock(0);

    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient.enqueueError(createHttpTimeoutError("timeout"));

    const shipping = createShippingService(buildRegistry(httpClient, clock));

    await expect(shipping.getRates("UPS", rateRequest)).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("throws auth errors for 401s", async () => {
    const httpClient = createStubHttpClient();
    const clock = createFakeClock(0);

    httpClient.enqueueResponse({ status: 200, headers: {}, body: JSON.stringify(tokenResponse) });
    httpClient.enqueueResponse({ status: 401, headers: {}, body: "unauthorized" });

    const shipping = createShippingService(buildRegistry(httpClient, clock));

    await expect(shipping.getRates("UPS", rateRequest)).rejects.toMatchObject({ code: "AUTH_ERROR" });
  });
});
