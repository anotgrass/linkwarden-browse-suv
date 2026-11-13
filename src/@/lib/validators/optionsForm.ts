import { z } from 'zod';

const httpUrl = z
  .string()
  .url('This has to be a URL')
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must start with http:// or https://');

export const optionsFormSchema = z
  .object({
    baseUrl: httpUrl,
    username: z.string(),
    password: z.string(),
    syncBookmarks: z.boolean().default(false),
    showIcons: z.boolean().default(true),
    defaultCollection: z.string().optional().default('Unorganized'),
    useApiKey: z.boolean().default(false),
    apiKey: z.string().optional(),
    method: z.enum(['username', 'apiKey']).default('apiKey'),
  })
  .superRefine((values, ctx) => {
    if (values.method === 'apiKey') {
      if (!values.apiKey?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['apiKey'],
          message: 'API key is required',
        });
      }
      return;
    }
    if (!values.username.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['username'],
        message: 'Username or email is required',
      });
    }
    if (values.password.length < 8) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must be at least 8 characters',
      });
    }
  });

export type optionsFormValues = z.infer<typeof optionsFormSchema>;

// Zod 4 distinguishes the schema's input from its output: fields with
// `.default()` are optional going in and guaranteed coming out. react-hook-form
// needs both, so `useForm` is parameterised with the input and the output.
export type optionsFormInput = z.input<typeof optionsFormSchema>;
