// Dairy Queen Rewards connector. Loyalty UI lives on dairyqueen.com; once
// signed in, the points balance shows on the DQ Rewards dashboard.

// Land directly on the rewards dashboard — signed-in users hit it without
// a redirect (fast scrape), signed-out users get bounced to DQ's signin
// flow which our ON_SIGNIN check picks up to surface the tab.
const LOGIN_URL = "https://www.dairyqueen.com/en-us/account/rewards/";

export const dairyqueen = {
  name: "Dairy Queen",
  authLabel: "Logged in at dairyqueen.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.dairyqueen.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
