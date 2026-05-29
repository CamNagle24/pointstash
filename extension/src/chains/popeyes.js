// Popeyes Rewards connector. Popeyes is on the same RBI platform as Burger
// King, so the loyalty UI lives on popeyes.com (no order.* subdomain).
// Auth is Firebase-backed via an in-page flow. The points balance lives on
// /rewards once signed in, and is typically also rendered in the site
// header on every page.

const LOGIN_URL = "https://www.popeyes.com/rewards";

export const popeyes = {
  name: "Popeyes",
  authLabel: "Logged in at popeyes.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.popeyes.com/*",

  async fetchBalance() {
    // Background-sync fallback: scraping has to happen in a tab. Returning
    // needs-login makes the alarm-driven path skip this chain cleanly.
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
