// Starbucks rewards connector. starbucks.com sets long-lived session cookies
// after a normal browser login; our manifest declares host_permissions for
// *.starbucks.com, so this fetch goes out from the service worker with those
// cookies attached and Starbucks responds as if their own site asked.
//
// IMPORTANT: the exact endpoint + JSON path here is a placeholder. Before
// shipping, open starbucks.com/account, sign in, watch DevTools → Network for
// the request that returns `starBalance` (commonly under /bff/ or
// /account-api/), and replace BALANCE_URL + the response parsing below.

const BALANCE_URL = "https://www.starbucks.com/bff/account";
// `/account` was retired by Starbucks (now 404s); `/account/signin` is the
// stable entry point. After a successful login Starbucks redirects to its
// own post-login destination, where the content script picks up and scrapes
// the balance. Already-logged-in users are redirected through it instantly.
const LOGIN_URL = "https://www.starbucks.com/account/signin";

export const starbucks = {
  name: "Starbucks",
  authLabel: "Logged in at starbucks.com",
  loginUrl: LOGIN_URL,
  // Match pattern used by chrome.tabs.query to find existing tabs we can
  // try to scrape before opening a new login tab. Must be a valid Chrome
  // match pattern (https://developer.chrome.com/docs/extensions/mv3/match_patterns).
  hostPattern: "https://*.starbucks.com/*",

  async fetchBalance() {
    const res = await fetch(BALANCE_URL, {
      credentials: "include",
      headers: { accept: "application/json" },
    });

    if (res.status === 401 || res.status === 403) {
      return { state: "needs-login", loginUrl: LOGIN_URL };
    }
    if (res.status === 404) {
      // Endpoint shape has likely changed — surface clearly so we know to fix
      // the URL rather than silently reporting "needs-login".
      return { state: "err", error: "Balance endpoint not found (404). Update BALANCE_URL." };
    }
    if (!res.ok) {
      return { state: "err", error: `HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => null);
    if (!data) return { state: "err", error: "Non-JSON response from Starbucks" };

    const balance =
      pickNumber(data, ["starBalance"]) ??
      pickNumber(data, ["rewards", "balance"]) ??
      pickNumber(data, ["profile", "starBalance"]);

    if (balance == null) {
      return {
        state: "err",
        error: "Could not find starBalance in response — Starbucks payload shape changed.",
      };
    }

    return { state: "ok", balance, raw: data };
  },
};

function pickNumber(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[key];
  }
  return typeof cur === "number" ? cur : null;
}
