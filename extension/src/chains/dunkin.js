// Dunkin' (DD Perks) connector. Loyalty UI lives on dunkindonuts.com —
// dunkin.com redirects there. Once signed in, the points balance shows on
// /en/dd-perks (the DD Perks dashboard) and typically also in the site
// header on every page.

// Land directly on the rewards dashboard — signed-in users hit it without
// a redirect (fast scrape), signed-out users get bounced to Dunkin's signin
// flow which our ON_SIGNIN check picks up to surface the tab.
const LOGIN_URL = "https://www.dunkindonuts.com/en/account/dunkinrewards";

export const dunkin = {
  name: "Dunkin'",
  authLabel: "Logged in at dunkindonuts.com",
  loginUrl: LOGIN_URL,
  // Both domains are owned by Dunkin' — patterns cover the redirect chain.
  hostPattern: "https://*.dunkindonuts.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
