// Pancheros Rewards connector. The loyalty UI lives on pancheros.com; once
// signed in, the points balance shows on the rewards page (and often in
// the site header).

const LOGIN_URL = "https://www.pancheros.com/rewards";

export const pancheros = {
  name: "Pancheros",
  authLabel: "Logged in at pancheros.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.pancheros.com/*",

  async fetchBalance() {
    // Background-sync fallback: scraping has to happen in a tab. Returning
    // needs-login makes the alarm-driven path skip this chain cleanly.
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
