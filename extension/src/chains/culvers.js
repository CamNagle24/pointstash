// Culver's MyCulver's Rewards connector. Loyalty UI lives on culvers.com;
// once signed in the points balance shows on the MyCulver's Rewards
// dashboard.

const LOGIN_URL = "https://www.culvers.com/rewards";

export const culvers = {
  name: "Culver's",
  authLabel: "Logged in at culvers.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.culvers.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
