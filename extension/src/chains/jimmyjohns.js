// Jimmy John's Freaky Fast Rewards connector. Loyalty UI lives on
// jimmyjohns.com; once signed in the points balance shows on the rewards
// dashboard.

const LOGIN_URL = "https://www.jimmyjohns.com/rewards";

export const jimmyjohns = {
  name: "Jimmy John's",
  authLabel: "Logged in at jimmyjohns.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.jimmyjohns.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
