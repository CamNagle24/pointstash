// Template for a new chain connector. Copy this file, rename, and fill in
// the marked TODOs. Every connector must export a single object with:
//
//   name      — display name shown in the popup
//   authLabel — short hint shown under the name ("Logged in via web", etc.)
//   loginUrl  — where to send the user when their session expires
//   fetchBalance() — async () => Result
//
// Result shape:
//   { state: "ok",          balance: number, raw?: unknown }
//   { state: "needs-login", loginUrl: string }
//   { state: "err",         error: string }

export const _stub = {
  name: "Example Chain",
  authLabel: "Logged in via example.com",
  loginUrl: "https://www.example.com/account",

  async fetchBalance() {
    // The request runs from the extension's service worker but carries the
    // user's example.com cookies because manifest.json grants host_permissions
    // for example.com. credentials:"include" is implicit for permitted hosts
    // but we set it explicitly for clarity.
    const res = await fetch("https://www.example.com/api/account/balance", {
      credentials: "include",
      headers: { accept: "application/json" },
    });

    if (res.status === 401 || res.status === 403) {
      return { state: "needs-login", loginUrl: this.loginUrl };
    }
    if (!res.ok) {
      return { state: "err", error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    // TODO: replace with the real field path for this chain.
    const balance = Number(data.points ?? 0);
    return { state: "ok", balance, raw: data };
  },
};
