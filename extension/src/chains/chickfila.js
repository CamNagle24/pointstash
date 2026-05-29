// Chick-fil-A One rewards connector. CFA has no standalone signin URL —
// they use an Auth0 modal that opens on top of whichever page the user is
// on. /my-rewards on the order subdomain is where the balance is rendered;
// logged-out users get redirected through the auth modal and back here.

const LOGIN_URL = "https://order.chick-fil-a.com/my-rewards";

export const chickfila = {
  name: "Chick-fil-A",
  authLabel: "Logged in at chick-fil-a.com",
  loginUrl: LOGIN_URL,
  hostPattern: "https://*.chick-fil-a.com/*",

  // Used by the alarm-driven background re-sync. The content script handles
  // the connect-chain flow; this fallback path is best-effort.
  async fetchBalance() {
    // No known stable balance endpoint outside the page — defer to whatever
    // the content script picks up on the next visit. Returning needs-login
    // makes the background sync skip this chain cleanly.
    return { state: "needs-login", loginUrl: LOGIN_URL };
  },
};
