// Display-only popup. All pairing is driven from the PointStash dashboard via
// externally_connectable — the user never sees a token. This popup just shows
// the user's current sync status so they know things are working.

import { getConfig, getLastSyncSummary } from "./storage.js";
import { CHAIN_REGISTRY } from "./chains/index.js";

const els = {
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  chains: document.getElementById("chains"),
  openDashboard: document.getElementById("open-dashboard"),
};

async function render() {
  const config = await getConfig();
  const paired = Boolean(config?.token);

  if (!paired) {
    els.statusDot.dataset.state = "warn";
    els.statusDot.title = "Not connected";
    els.statusText.textContent =
      "Visit pointstash.com and click 'Connect' on any chain to get started.";
    els.chains.innerHTML = "";
    return;
  }

  els.statusDot.dataset.state = "ok";
  els.statusDot.title = `Connected as ${config.email ?? "you"}`;
  els.statusText.textContent = config.email
    ? `Connected as ${config.email}`
    : "Connected to PointStash.";

  const summary = await getLastSyncSummary();
  els.chains.innerHTML = "";
  for (const [slug, chain] of Object.entries(CHAIN_REGISTRY)) {
    const entry = summary?.[slug];
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <div class="chain-name">${chain.name}</div>
        <div class="muted">${chain.authLabel}</div>
      </div>
      <div class="chain-right">
        <span class="chain-balance">${entry?.balance ?? "—"}</span>
        <span class="chain-state" data-state="${entry?.state ?? "idle"}">
          ${entry?.state === "needs-login" ? "log in" : entry?.state ?? ""}
        </span>
      </div>
    `;
    els.chains.appendChild(li);
  }
}

els.openDashboard.addEventListener("click", async () => {
  const config = await getConfig();
  const baseUrl = config?.baseUrl ?? "https://pointstash.com";
  chrome.tabs.create({ url: `${baseUrl}/dashboard` });
});

render();
