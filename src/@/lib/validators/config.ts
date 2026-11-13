import { z } from 'zod';

const httpUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must start with http:// or https://');

export const configSchema = z.object({
  baseUrl: httpUrl,
  defaultCollection: z.string().optional().default('Unorganized'),
  apiKey: z.string(),
  syncBookmarks: z.boolean().optional().default(false),
  showIcons: z.boolean().optional().default(true),
});

export type configType = z.infer<typeof configSchema>;
