// Panda Express Panda Rewards connector. Loyalty UI lives on
// pandaexpress.com; once signed in the points balance shows on the
// rewards dashboard.

const LOGIN_URL = "https://www.pandaexpress.com/myrewards/earn";

export const pandaexpress = {
  name: "Panda Express",
  authLabel: "Logged in at pandaexpress.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.pandaexpress.com/*",

  async fetchBalance() {
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
