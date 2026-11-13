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
import { clearBookmarksMetadata } from "../lib/cache.ts";

interface OptionsFormProps {
  onSaved?: () => void;
  onCleared?: () => void;
  initialConfig?: configType;
}

const EMPTY_FORM: optionsFormInput = {
  baseUrl: "https://cloud.linkwarden.app",
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
        throw new Error("Not configured");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description:
          "Either you didn't configure the extension or there was an error while trying to sign out. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      form.reset({ ...EMPTY_FORM, baseUrl: "" });
      await clearConfig();
      await clearBookmarksMetadata();
      setSignedInTo(null);
      onCleared?.();
    },
  });

  // Same save path as upstream for API keys: store the key and use it as Bearer token.
  const { mutate: onSubmit, isPending } = useMutation({
    mutationFn: async (values: optionsFormValues) => {
      const baseUrl = values.baseUrl.replace(/\/$/, "");
      const apiKey = values.apiKey.trim();
      if (!apiKey) {
        throw new Error("API key is required");
      }
      return { ...values, baseUrl, apiKey };
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong, check your values are correct.",
        variant: "destructive",
      });
    },
    onSuccess: async (values) => {
      await saveConfig({
        baseUrl: values.baseUrl,
        defaultCollection: values.defaultCollection,
        syncBookmarks: values.syncBookmarks,
        showIcons: values.showIcons ?? true,
        apiKey: values.apiKey,
      });

      setSignedInTo(values.baseUrl);

      toast({
        title: "Saved",
        description:
          "Your settings have been saved. You can close this tab and reopen the extension.",
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

  const { handleSubmit, control } = form;

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

          <FormField
            control={control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormDescription>
                  Create one in Linkwarden under Settings → Access Tokens.
                </FormDescription>
                <FormControl>
                  <Input
                    placeholder="Your API Key"
                    autoComplete="off"
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pb-2">
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
