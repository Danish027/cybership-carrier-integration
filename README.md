# Cybership Carrier Integration Service

A production-style carrier integration service built in TypeScript, focused on UPS Rating. 

## What’s Inside

- **Rate shopping**: Domain-level rate requests are mapped to UPS API payloads; responses are normalized into internal rate quotes.
- **OAuth 2.0 client credentials**: Token acquisition, caching, and refresh on expiry.
- **Extensible architecture**: Carriers register via a registry and expose operations (rate, label, tracking, etc.).
- **Runtime validation**: Zod schemas validate inputs and UPS responses.
- **Structured errors**: Consistent error codes for auth, rate limiting, network issues, malformed responses, and more.
- **Integration tests**: End-to-end logic tests using stubbed HTTP payloads.

## Project Layout

- `src/core`: shared domain types, validation, errors, HTTP abstractions
- `src/services`: carrier registry and shipping service entry point
- `src/carriers/ups`: UPS OAuth, rate mapping, and UPS-specific types
- `tests/integration`: stubbed end-to-end tests

## Quick Start

```bash
npm install
npm test
```

Copy `.env.example` to `.env` and fill in values if you want to use the real UPS endpoints.

## Configuration

All configuration is environment-based. See `.env.example`:

```
UPS_CLIENT_ID=
UPS_CLIENT_SECRET=
UPS_OAUTH_URL=
UPS_RATE_URL=
UPS_ACCOUNT_NUMBER=
UPS_TIMEOUT_MS=10000
```

## Usage Example

```ts
import {
  createCarrierRegistry,
  createShippingService,
  createUpsAdapter,
  createFetchHttpClient,
  loadConfig
} from "./src";

const config = loadConfig();
const httpClient = createFetchHttpClient();

const registry = createCarrierRegistry();
registry.register(createUpsAdapter(httpClient, config.ups));

const shippingService = createShippingService(registry);

const rates = await shippingService.getRates("UPS", {
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
  packages: [{ weight: { value: 2, unit: "LBS" } }]
});

console.log(rates);
```

## How It Works

1. **Input validation** (`src/core/validation.ts`) ensures requests are structurally correct before any external call.
2. **UPS OAuth** (`src/carriers/ups/auth.ts`) acquires and caches tokens using a closure-based client.
3. **Request mapping** (`src/carriers/ups/rateMapper.ts`) transforms domain models into UPS payloads.
4. **Response parsing** normalizes UPS responses into internal `RateResponse` structures.
5. **Error handling** returns consistent, structured errors with a `code` field for callers to act on.

## Extending to New Carriers

To add another carrier (e.g. FedEx):

1. Create a new adapter in `src/carriers/fedex`.
2. Implement the carrier’s operations (e.g. `createFedexRateService`).
3. Register it with `createCarrierRegistry()`.

The existing UPS code remains unchanged.

## Tests

Integration tests stub the HTTP layer and validate:

- Request payload shape
- Response parsing/normalization
- OAuth token reuse and refresh
- Error handling for 4xx/5xx, malformed JSON, and timeouts

Run the tests:

```bash
npm test
```

