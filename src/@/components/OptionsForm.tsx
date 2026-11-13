// ./OptionsForm.tsx

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/Form.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  optionsFormInput,
  optionsFormSchema,
  optionsFormValues,
} from "../lib/validators/optionsForm.ts";
import { Input } from "./ui/Input.tsx";
import { Button } from "./ui/Button.tsx";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  clearConfig,
  getConfig,
  isConfigured,
  saveConfig,
} from "../lib/config.ts";
import { configType } from "../lib/validators/config.ts";
import { Toaster } from "./ui/Toaster.tsx";
import { toast } from "../../hooks/useToast.ts";
import { AxiosError } from "axios";
import { clearBookmarksMetadata } from "../lib/cache.ts";
import { getSession, revokeSession } from "../lib/auth/auth.ts";

interface OptionsFormProps {
  onSaved?: () => void;
  onCleared?: () => void;
  initialConfig?: configType;
}

const EMPTY_FORM: optionsFormInput = {
  baseUrl: "https://cloud.linkwarden.app",
  method: "username",
  username: "",
  password: "",
  apiKey: "",
  syncBookmarks: false,
  showIcons: true,
  defaultCollection: "Unorganized",
};

const displayInstance = (baseUrl: string) =>
  baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

const signedInInstance = (config: configType | undefined) => {
  if (config === undefined) return undefined;
  return config.baseUrl && config.apiKey ? config.baseUrl : null;
};

const OptionsForm = ({
  onSaved,
  onCleared,
  initialConfig,
}: OptionsFormProps) => {
  const initialSignedInTo = signedInInstance(initialConfig);

  const [signedInTo, setSignedInTo] = useState<string | undefined | null>(
    initialSignedInTo
  );

  const form = useForm<optionsFormInput, unknown, optionsFormValues>({
    resolver: zodResolver(optionsFormSchema),
    defaultValues: initialSignedInTo
      ? { ...EMPTY_FORM, ...initialConfig }
      : EMPTY_FORM,
  });

  const { mutate: onSignOut, isPending: signOutLoading } = useMutation({
    mutationFn: async () => {
      const configured = await isConfigured();

      if (!configured) {
        return new Error("Not configured");
      }

      return;
    },
    onError: () => {
      toast({
        title: "Error",
        description:
          "Either you didn't configure the extension or there was an error while trying to sign out. Please try again.",
        variant: "destructive",
      });
      return;
    },
    onSuccess: async () => {
      const { baseUrl, apiKey } = await getConfig();

      // Revokes the token from a username/password sign in on the server, an API key is left as is
      revokeSession(baseUrl, apiKey).catch(() => {});

      // Reset the form
      form.reset({
        baseUrl: "",
        method: "username",
        username: "",
        password: "",
        apiKey: "",
        syncBookmarks: false,
        showIcons: true,
        defaultCollection: "Unorganized",
      });
      await clearConfig();
      await clearBookmarksMetadata();
      setSignedInTo(null);
      onCleared?.();
      return;
    },
  });

  const { mutate: onSubmit, isPending } = useMutation({
    mutationFn: async (values: optionsFormValues) => {
      values.baseUrl = values.baseUrl.replace(/\/$/, "");
      // Do API call to test the connection and save the values

      if (values.method === "apiKey") {
        return {
          ...values,
          data: {
            response: {
              token: values.apiKey,
            },
          } as {
            response: {
              token: string;
            };
          },
        };
      } else {
        // Handle Username/Password authentication
        const session = await getSession(
          values.baseUrl,
          values.username,
          values.password
        );

        if (session.status !== 200) {
          throw new Error("Invalid credentials");
        }

        return {
          ...values,
          data: session.data as {
            response: {
              token: string;
            };
          },
        };
      }
    },
    onError: (error) => {
      // Handle errors appropriately
      if (error instanceof AxiosError) {
        if (error.response?.data?.code === "TOO_MANY_ATTEMPTS") {
          toast({
            title: "Error",
            description: error.response.data.response,
            variant: "destructive",
          });
        } else if (error.response?.status === 401) {
          toast({
            title: "Error",
            description: "Invalid credentials or API Key",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Something went wrong, try again please.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Something went wrong, check your values are correct.",
          variant: "destructive",
        });
      }
    },
    onSuccess: async (values) => {
      await saveConfig({
        baseUrl: values.baseUrl,
        defaultCollection: values.defaultCollection,
        syncBookmarks: values.syncBookmarks,
        showIcons: values.showIcons ?? true,
        apiKey:
          values.method === "apiKey" && values.apiKey
            ? values.apiKey
            : values.data.response.token,
      });

      setSignedInTo(values.baseUrl);

      toast({
        title: "Saved",
        description: "Your settings have been saved.",
        variant: "success",
      });

      onSaved?.();
    },
  });

  useEffect(() => {
    if (initialSignedInTo !== undefined) return;

    (async () => {
      const cachedOptions = await getConfig();
      const instance = signedInInstance(cachedOptions);
      if (instance) form.reset({ ...EMPTY_FORM, ...cachedOptions });
      setSignedInTo(instance);
    })();
  }, [form, initialSignedInTo]);

  const { handleSubmit, control, watch } = form;
  const method = watch("method");

  if (signedInTo === undefined) return null;

  if (signedInTo) {
    return (
      <div className="px-2 space-y-4">
        <p className="text-sm">
          Signed in to{" "}
          <span className="font-medium break-all">
            {displayInstance(signedInTo)}
          </span>
        </p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.watch("showIcons") ?? true}
            onChange={async (e) => {
              const showIcons = e.target.checked;
              form.setValue("showIcons", showIcons);
              const current = await getConfig();
              await saveConfig({ ...current, showIcons });
              toast({
                title: "Saved",
                description: showIcons
                  ? "Link icons enabled"
                  : "Link icons disabled",
                variant: "success",
              });
            }}
          />
          Show link icons
        </label>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onSignOut()}
          disabled={signOutLoading}
        >
          Sign Out
        </Button>
        <Toaster />
      </div>
    );
  }

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data))}
          className="space-y-3 px-2"
          autoComplete="off"
        >
          <FormField
            control={control}
            name="baseUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormDescription>
                  The address of the Linkwarden instance.
                </FormDescription>
                <FormControl>
                  <Input
                    placeholder="https://cloud.linkwarden.app"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Native select: custom popovers close the Firefox toolbar popup. */}
          <FormField
            control={control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method</FormLabel>
                <FormDescription>
                  Choose your preferred authentication method.
                </FormDescription>
                <FormControl>
                  <select
                    className="field flex h-9 w-full px-3 py-1 text-sm"
                    value={field.value ?? "username"}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  >
                    <option value="username">Username and Password</option>
                    <option value="apiKey">API Key</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditionally render API Key or Username/Password fields */}
          {method === "apiKey" ? (
            <FormField
              control={control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormDescription>
                    Enter your Linkwarden API Key.
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="Your API Key"
                      autoComplete="off"
                      {...field}
                      type="password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <>
              <FormField
                control={control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormDescription>
                      Your Linkwarden Username or Email.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="johnny"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormDescription>
                      Password for your Linkwarden account.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="••••••••••••••"
                        autoComplete="current-password"
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Commented out fields */}
          {/* 
          <FormField
            control={control}
            name="defaultCollection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default collection</FormLabel>
                <FormDescription>
                  Default collection to add bookmarks to.
                </FormDescription>
                <FormControl>
                  <Input placeholder="Unorganized" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          */}

          {/* 
          <FormField
            control={control}
            name="syncBookmarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sync Bookmarks (Experimental)</FormLabel>
                <FormDescription>
                  Sync your bookmarks with Linkwarden.
                </FormDescription>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          */}

          <div className="flex justify-end pb-2">
            <Button disabled={isPending} type="submit">
              Save
            </Button>
          </div>
        </form>
      </Form>
      <Toaster />
    </div>
  );
};

export default OptionsForm;
