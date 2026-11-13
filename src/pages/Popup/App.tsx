import Container from "../../@/components/Container.tsx";
import WholeContainer from "../../@/components/WholeContainer.tsx";
import BookmarkForm from "../../@/components/BookmarkForm.tsx";
import CascadingBookmarks from "../../@/components/CascadingBookmarks.tsx";
import { useCallback, useEffect, useState } from "react";
import { getConfig, isConfigured } from "../../@/lib/config.ts";
import { getBrowser, isSafeHttpUrl, openSafeUrl } from "../../@/lib/utils.ts";
import NotConfigured from "../../@/components/NotConfigured.tsx";
import { ModeToggle } from "../../@/components/ModeToggle.tsx";
import { Button } from "@/@/components/ui/Button.tsx";
import { ArrowLeft, Plus, Settings } from "lucide-react";

type View = "browse" | "add";

function openExtensionOptions() {
  const browserApi = getBrowser();
  // Full options tab — survives closing the toolbar popup (unlike in-popup forms).
  if (browserApi.runtime.openOptionsPage) {
    void browserApi.runtime.openOptionsPage();
    return;
  }
  void browserApi.tabs.create({
    url: browserApi.runtime.getURL("src/pages/Options/options.html"),
  });
}

function App() {
  const [isAllConfigured, setIsAllConfigured] = useState<boolean>();
  const [baseUrl, setBaseUrl] = useState<string>();
  const [view, setView] = useState<View>("browse");

  const refreshConfig = useCallback(async () => {
    const cachedOptions = await isConfigured();
    const cachedConfig = await getConfig();

    setBaseUrl(cachedConfig.baseUrl);
    setIsAllConfigured(cachedOptions);

    return cachedOptions;
  }, []);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  // When the popup is reopened after configuring in the options tab.
  useEffect(() => {
    const onFocus = () => {
      void refreshConfig();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshConfig]);

  const title = view === "add" ? "Add Site" : "Bookmarks";

  return (
    <WholeContainer className="max-h-[720px] min-h-[560px]">
      <Container className="w-[400px]">
        <header className="rise-in flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {view === "add" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setView("browse")}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            ) : isSafeHttpUrl(baseUrl) ? (
              <button
                type="button"
                className="shrink-0 rounded-xl transition-transform duration-200 hover:scale-[1.03]"
                onClick={() => void openSafeUrl(baseUrl)}
              >
                <img
                  src="./128.png"
                  height="32"
                  width="32"
                  className="rounded-xl shadow-sm ring-1 ring-border/60"
                  alt="Linkwarden Logo"
                />
              </button>
            ) : (
              <img
                src="./128.png"
                height="32"
                width="32"
                className="shrink-0 rounded-xl shadow-sm ring-1 ring-border/60"
                alt="Linkwarden Logo"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Linkwarden
              </p>
              <h1 className="truncate text-[1.15rem] leading-tight">{title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {view === "browse" ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1"
                onClick={() => setView("add")}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Site
              </Button>
            ) : null}
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openExtensionOptions()}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Open settings</span>
            </Button>
          </div>
        </header>

        {view === "add" ? (
          <div className="rise-in mt-2">
            <BookmarkForm
              stayOpen
              onSaved={() => setView("browse")}
              onCancel={() => setView("browse")}
            />
            <NotConfigured
              open={isAllConfigured === false}
              onConfigure={() => openExtensionOptions()}
            />
          </div>
        ) : (
          <div className="rise-in mt-3 flex min-h-0 max-h-[600px] flex-1 flex-col">
            <CascadingBookmarks />
            <NotConfigured
              open={isAllConfigured === false}
              onConfigure={() => openExtensionOptions()}
            />
          </div>
        )}
      </Container>
    </WholeContainer>
  );
}

export default App;
