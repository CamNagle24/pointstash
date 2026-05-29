// Wendy's Rewards connector. Wendy's uses the same pattern as Chick-fil-A:
// the order subdomain hosts the loyalty UI. Auth is Punchh-backed via an
// in-page modal — there's no standalone /signin URL. The balance lives on
// /us/en/loyalty/rewards (and is also visible in the header on every page);
// /account by itself doesn't render the points number prominently.

const LOGIN_URL = "https://order.wendys.com/us/en/loyalty/rewards";

export const wendys = {
  name: "Wendy's",
  authLabel: "Logged in at wendys.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.wendys.com/*",

  async fetchBalance() {
    // Background-sync fallback: scraping has to happen in a tab. Returning
    // needs-login makes the alarm-driven path skip this chain cleanly.
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
