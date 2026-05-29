// KFC Rewards connector. Loyalty UI lives on kfc.com; once signed in the
// points balance shows on the rewards dashboard.

const LOGIN_URL = "https://www.kfc.com/dashboard";

export const kfc = {
  name: "KFC",
  authLabel: "Logged in at kfc.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.kfc.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
