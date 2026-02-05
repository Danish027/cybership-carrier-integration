import { z } from "zod";

export const AddressSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address1: z.string().min(1),
  address2: z.string().min(1).optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2)
});

export const PackageDimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["IN", "CM"])
});

export const PackageWeightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["LBS", "KGS"])
});

export const PackageSchema = z.object({
  weight: PackageWeightSchema,
  dimensions: PackageDimensionsSchema.optional()
});

export const RateRequestSchema = z.object({
  shipper: AddressSchema,
  shipFrom: AddressSchema.optional(),
  shipTo: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  serviceCode: z.string().min(1).optional()
});

export type RateRequestInput = z.input<typeof RateRequestSchema>;
