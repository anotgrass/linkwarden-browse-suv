import {
  getBrowser,
  getCurrentTabInfo,
  hasAPI,
  isSafari,
  updateBadge,
} from "../../@/lib/utils.ts";
// import BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
import { getConfig, isConfigured } from "../../@/lib/config.ts";
import {
  // deleteLinkFetch,
  // updateLinkFetch,
  postLinkFetch,
} from "../../@/lib/actions/links.ts";
import {
  bookmarkMetadata,
  // deleteBookmarkMetadata,
  // getBookmarkMetadataByBookmarkId,
  // getBookmarkMetadataByUrl,
  getBookmarksMetadata,
  saveBookmarkMetadata,
} from "../../@/lib/cache.ts";
import OnClickData = chrome.contextMenus.OnClickData;

// @types/chrome models these as TS enums, but the runtime APIs take and hand
// back plain strings, so use the string form of each enum.
type ContextType = `${chrome.contextMenus.ContextType}`;
type OnInputEnteredDisposition = `${chrome.omnibox.OnInputEnteredDisposition}`;
// import {
//   getCsrfTokenFetch,
//   getSessionFetch,
//   performLoginOrLogoutFetch,
// } from '../../@/lib/auth/auth.ts';

const browser = getBrowser();

// This is the main functions that will be called when a bookmark is created, update or deleted
// Won't work with axios xhr or something not supported by the browser

// browser.bookmarks.onCreated.addListener(
//   async (_id: string, bookmark: BookmarkTreeNode) => {
//     try {
//       const { syncBookmarks, baseUrl, username, password } = await getConfig();
//       if (!syncBookmarks || !bookmark.url) {
//         return;
//       }
//       const session = await getSessionFetch(baseUrl);

//       // Check if the bookmark already exists in the server by checking the url so, it doesn't create duplicates
//       // I know, could use the method search from the api, but I want to avoid as much api specific calls as possible
//       // in case isn't supported, so I prefer to do it this way, if performance is an issue I will think of change to that.

//       const existingLink = await getBookmarkMetadataByUrl(bookmark.url);
//       if (existingLink) {
//         return;
//       }

//       if (!session) {
//         const csrfToken = await getCsrfTokenFetch(baseUrl);

//         await performLoginOrLogoutFetch(
//           `${baseUrl}/api/v1/auth/callback/credentials`,
//           {
//             csrfToken: csrfToken,
//             callbackUrl: `${baseUrl}/api/v1/auth/callback`,
//             json: true,
//             redirect: false,
//             username: username,
//             password: password,
//           }
//         );
//       }

//       const newLink = await postLinkFetch(baseUrl, {
//         url: bookmark.url,
//         collection: {
//           name: 'Unorganized',
//         },
//         tags: [],
//         name: bookmark.title,
//         description: bookmark.title,
//       });

//       const newLinkJson = await newLink.json();
//       const newLinkUrl: bookmarkMetadata = newLinkJson.response;
//       newLinkUrl.bookmarkId = bookmark.id;

//       await saveBookmarkMetadata(newLinkUrl);
//     } catch (error) {
//       console.error(error);
//     }
//   }
// );

// browser.bookmarks.onChanged.addListener(
//   async (id: string, changeInfo: chrome.bookmarks.BookmarkChangeInfo) => {
//     try {
//       const { syncBookmarks, baseUrl, username, password, usingSSO } =
//         await getConfig();
//       if (!syncBookmarks || !changeInfo.url) {
//         return;
//       }

//       const link = await getBookmarkMetadataByBookmarkId(id);

//       if (!link) {
//         return;
//       }

//       const session = await getSessionFetch(baseUrl);

//       if (!session && !usingSSO) {
//         const csrfToken = await getCsrfTokenFetch(baseUrl);

//         await performLoginOrLogoutFetch(
//           `${baseUrl}/api/v1/auth/callback/credentials`,
//           {
//             csrfToken: csrfToken,
//             callbackUrl: `${baseUrl}/api/v1/auth/callback`,
//             json: true,
//             redirect: false,
//             username: username,
//             password: password,
//           }
//         );
//       } else if (!session && usingSSO) {
//         return;
//       }

//       const updatedLink = await updateLinkFetch(baseUrl, link.id, {
//         url: changeInfo.url,
//         collection: {
//           name: 'Unorganized',
//         },
//         tags: [],
//         name: changeInfo.title,
//         description: changeInfo.title,
//       });

//       const updatedLinkJson = await updatedLink.json();
//       const newLinkUrl: bookmarkMetadata = updatedLinkJson.response;
//       newLinkUrl.bookmarkId = id;

//       await saveBookmarkMetadata(newLinkUrl);
//     } catch (error) {
//       console.error(error);
//     }
//   }
// );

// browser.bookmarks.onRemoved.addListener(
//   async (id: string, removeInfo: chrome.bookmarks.BookmarkRemoveInfo) => {
//     try {
//       const { syncBookmarks, baseUrl } =
//         await getConfig();
//       if (!syncBookmarks || !removeInfo.node.url) {
//         return;
//       }
//       const link = await getBookmarkMetadataByBookmarkId(id);

//       if (!link) {
//         return;
//       }

//       const session = await getSessionFetch(baseUrl);

//       if (!session) {
//         const csrfToken = await getCsrfTokenFetch(baseUrl);

//         await performLoginOrLogoutFetch(
//           `${baseUrl}/api/v1/auth/callback/credentials`,
//           {
//             csrfToken: csrfToken,
//             callbackUrl: `${baseUrl}/api/v1/auth/callback`,
//             json: true,
//             redirect: false,
//             username: username,
//             password: password,
//           }
//         );
//       } else if (!session && usingSSO) {
//         return;
//       }

//       await Promise.all([
//         deleteBookmarkMetadata(link.bookmarkId),
//         deleteLinkFetch(baseUrl, link.id),
//       ]);
//     } catch (error) {
//       console.error(error);
//     }
//   }
// );

// This is for the context menus!
// Example taken from: https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/api-samples/contextMenus/basic/sample.js
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await genericOnClick(info, tab);
});

function isSkippableUrl(url: string | undefined): boolean {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("about:") ||
    url.startsWith("moz-extension://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://")
  );
}

async function notify(title: string, message: string) {
  try {
    if (hasAPI("notifications.create")) {
      await browser.notifications.create({
        type: "basic",
        iconUrl: "128.png",
        title,
        message,
      });
    }
  } catch (error) {
    console.error(error);
  }
}

// A generic onclick callback function.
async function genericOnClick(
  info: OnClickData,
  tab: chrome.tabs.Tab | undefined
) {
  const configured = await isConfigured();
  if (!configured) {
    await notify("Linkwarden", "Configure the extension first (open settings).");
    return;
  }

  const config = await getConfig();
  const { syncBookmarks, baseUrl, apiKey, defaultCollection } = config;

  switch (info.menuItemId) {
    case "save-all-tabs": {
      const tabs = await browser.tabs.query({ currentWindow: true });
      let saved = 0;
      let failed = 0;

      for (const current of tabs) {
        if (isSkippableUrl(current.url)) continue;
        try {
          if (!current.url || !new URL(current.url)) continue;
          const res = await postLinkFetch(
            baseUrl,
            {
              url: current.url,
              name: current.title || "",
              description: current.title || "",
              collection: {
                name: defaultCollection || "Unorganized",
              },
              tags: [],
            },
            apiKey
          );
          if (res.ok) saved += 1;
          else failed += 1;
        } catch (error) {
          failed += 1;
          console.error(`Failed to save tab: ${current.url}`, error);
        }
      }

      await notify(
        "Linkwarden",
        failed
          ? `Saved ${saved} tab(s), ${failed} failed.`
          : `Saved ${saved} tab(s).`
      );
      break;
    }
    default: {
      const linkUrl =
        info.menuItemId === "link" && info.linkUrl ? info.linkUrl : tab?.url;
      const title =
        info.menuItemId === "link" && info.linkUrl
          ? info.linkUrl
          : tab?.title || linkUrl || "";

      if (isSkippableUrl(linkUrl) || !linkUrl) {
        await notify("Linkwarden", "This page can't be saved.");
        return;
      }

      if (syncBookmarks && hasAPI("bookmarks.create")) {
        browser.bookmarks.create({
          parentId: "1",
          title: title,
          url: linkUrl,
        });
        await notify("Linkwarden", "Bookmark created locally.");
        return;
      }

      try {
        const newLink = await postLinkFetch(
          baseUrl,
          {
            url: linkUrl,
            collection: {
              name: defaultCollection || "Unorganized",
            },
            tags: [],
            name: title,
            description: title,
          },
          apiKey
        );

        if (!newLink.ok) {
          await notify("Linkwarden", "Failed to save link.");
          return;
        }

        const newLinkJson = await newLink.json();
        const newLinkUrl: bookmarkMetadata = newLinkJson.response;
        newLinkUrl.bookmarkId = tab?.id?.toString();
        await saveBookmarkMetadata(newLinkUrl);
        if (tab?.id != null) await updateBadge(tab.id, true);
        await notify("Linkwarden", "Saved to Linkwarden.");
      } catch (error) {
        console.error(error);
        await notify("Linkwarden", "Failed to save link.");
      }
    }
  }
}
browser.runtime.onInstalled.addListener(async function () {
  // Create one test item for each context type.
  const contexts: ContextType[] = isSafari()
    ? ["page", "selection", "link"]
    : ["page", "selection", "link", "editable", "image", "video", "audio"];
  for (const context of contexts) {
    browser.contextMenus.create({
      title: "Save to Linkwarden",
      contexts: [context],
      id: context,
    });
  }
  browser.contextMenus.create({
    id: "save-all-tabs",
    title: "Save all tabs to Linkwarden",
    contexts: ["page"],
  });
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;
  try {
    await updateBadge(tabId, false);
  } catch (error) {
    console.error(`Error clearing the badge of tab ${tabId}:`, error);
  }
});

// Omnibox implementation (not available in Safari)

if (hasAPI("omnibox.onInputStarted")) {
  browser.omnibox.onInputStarted.addListener(async () => {
    const configured = await isConfigured();
    const description = configured
      ? "Search links in linkwarden"
      : "Please configure the extension first";

    browser.omnibox.setDefaultSuggestion({
      description: description,
    });
  });

  browser.omnibox.onInputChanged.addListener(
    async (
      text: string,
      suggest: (arg0: { content: string; description: string }[]) => void
    ) => {
      const configured = await isConfigured();

      if (!configured) {
        return;
      }

      const currentBookmarks = await getBookmarksMetadata();

      const searchedBookmarks = currentBookmarks.filter((bookmark) => {
        return bookmark.name?.includes(text) || bookmark.url.includes(text);
      });

      const bookmarkSuggestions = searchedBookmarks
        .filter((bookmark) => /^https?:\/\//i.test(bookmark.url))
        .map((bookmark) => {
          return {
            content: bookmark.url,
            description: bookmark.name || bookmark.url,
          };
        });
      suggest(bookmarkSuggestions);
    }
  );

  // This part was taken https://github.com/sissbruecker/linkding-extension/blob/master/src/background.js Thanks to @sissbruecker

  browser.omnibox.onInputEntered.addListener(
    async (content: string, disposition: OnInputEnteredDisposition) => {
      if (!(await isConfigured()) || !content) {
        return;
      }

      const { baseUrl } = await getConfig();
      let url: string;
      if (/^https?:\/\//i.test(content)) {
        try {
          const parsed = new URL(content);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return;
          }
          url = parsed.href;
        } catch {
          return;
        }
      } else if (/^https?:\/\//i.test(baseUrl)) {
        // Text that isn't a link opens the instance's search page for it.
        url = `${baseUrl.replace(/\/$/, "")}/search?q=` + encodeURIComponent(content);
      } else {
        return;
      }

      // Edge doesn't allow updating the New Tab Page (tested with version 117).
      // Trying to do so will throw: "Error: Cannot update NTP tab."
      // As a workaround, open a new tab instead.
      if (disposition === "currentTab") {
        const tabInfo = await getCurrentTabInfo();
        if (tabInfo.url === "edge://newtab/") {
          disposition = "newForegroundTab";
        }
      }

      switch (disposition) {
        case "currentTab":
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await browser.tabs.update({ url });
          break;
        case "newForegroundTab":
          await browser.tabs.create({ url });
          break;
        case "newBackgroundTab":
          await browser.tabs.create({ url, active: false });
          break;
      }
    }
  );
}
