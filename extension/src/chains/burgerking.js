// Burger King Royal Perks connector. BK's loyalty UI lives on bk.com — no
// order.* subdomain. Auth is Firebase-backed with an in-page flow. The
// crown balance lives on /rewards once signed in, and is typically also
// rendered as a pill in the site header on every page.

const LOGIN_URL = "https://www.bk.com/rewards";

export const burgerking = {
  name: "Burger King",
  authLabel: "Logged in at bk.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.bk.com/*",

  async fetchBalance() {
    // Background-sync fallback: scraping has to happen in a tab. Returning
    // needs-login makes the alarm-driven path skip this chain cleanly.
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
