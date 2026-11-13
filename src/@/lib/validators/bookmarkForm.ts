import { z } from 'zod';

export const bookmarkFormSchema = z.object({
  url: z
    .string()
    .url('This has to be a URL')
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL must start with http:// or https://'),
  collection: z
    .object({
      id: z.number().optional(),
      ownerId: z.number().optional(),
      name: z.string(),
    })
    .optional(),
  tags: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string(),
      })
    )
    .nullish(),
  name: z.string(),
  description: z.string(),
  image: z.enum(['jpeg', 'png']).optional(),
});

export type bookmarkFormValues = z.infer<typeof bookmarkFormSchema>;
