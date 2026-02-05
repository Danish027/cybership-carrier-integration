import { z } from "zod";

export const UpsTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number()
});

export type UpsTokenResponse = z.infer<typeof UpsTokenResponseSchema>;

export const UpsRatedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string()
  }),
  TotalCharges: z.object({
    CurrencyCode: z.string(),
    MonetaryValue: z.string()
  }),
  GuaranteedDelivery: z
    .object({
      BusinessDaysInTransit: z.string()
    })
    .optional()
});

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    RatedShipment: z.union([UpsRatedShipmentSchema, z.array(UpsRatedShipmentSchema)])
  })
});

export type UpsRateResponse = z.infer<typeof UpsRateResponseSchema>;

export const UpsErrorSchema = z.object({
  response: z
    .object({
      errors: z.array(
        z.object({
          code: z.string().optional(),
          message: z.string().optional()
        })
      )
    })
    .optional(),
  Fault: z
    .object({
      detail: z
        .object({
          Errors: z
            .object({
              ErrorDetail: z
                .object({
                  PrimaryErrorCode: z
                    .object({
                      Code: z.string().optional(),
                      Description: z.string().optional()
                    })
                    .optional()
                })
                .optional()
            })
            .optional()
        })
        .optional()
    })
    .optional()
});

export type UpsErrorPayload = z.infer<typeof UpsErrorSchema>;
