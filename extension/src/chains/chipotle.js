// Chipotle Rewards connector. The loyalty UI lives on chipotle.com; once
// signed in, the points balance shows on /order/rewards (and typically in
// the site header on every page).

const LOGIN_URL = "https://www.chipotle.com/order/rewards";

export const chipotle = {
  name: "Chipotle",
  authLabel: "Logged in at chipotle.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.chipotle.com/*",

  async fetchBalance() {
    // Background-sync fallback: scraping has to happen in a tab. Returning
    // needs-login makes the alarm-driven path skip this chain cleanly.
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
