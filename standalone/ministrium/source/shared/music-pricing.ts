import { z } from "zod";

// Store prices in minor currency units to avoid floating-point rounding.
export const musicPricingSchema = z.object({
  usdAudioCents: z.number().int().min(50).max(100000),
  usdVideoCents: z.number().int().min(50).max(100000),
  ngnAudioKobo: z.number().int().min(100).max(100000000),
  ngnVideoKobo: z.number().int().min(100).max(100000000),
}).strict();

export type MusicPricing = z.infer<typeof musicPricingSchema>;
export const defaultMusicPricing: MusicPricing = {
  usdAudioCents: 50,
  usdVideoCents: 50,
  ngnAudioKobo: 20000,
  ngnVideoKobo: 20000,
};
