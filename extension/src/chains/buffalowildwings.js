// Buffalo Wild Wings Blazin' Rewards connector. Loyalty UI lives on
// buffalowildwings.com; once signed in the points balance shows on the
// Blazin' Rewards dashboard.

const LOGIN_URL = "https://www.buffalowildwings.com/account/rewards/";

export const buffalowildwings = {
  name: "Buffalo Wild Wings",
  authLabel: "Logged in at buffalowildwings.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.buffalowildwings.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
