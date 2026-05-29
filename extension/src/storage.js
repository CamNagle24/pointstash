// Thin wrappers around chrome.storage.local so the rest of the extension can
// stay async/await-clean and not care which storage area it's reading from.

const CONFIG_KEY = "config";
const SUMMARY_KEY = "lastSync";

export async function getConfig() {
  const { [CONFIG_KEY]: cfg } = await chrome.storage.local.get(CONFIG_KEY);
  return cfg ?? null;
}

export async function setPairing({ token, baseUrl, userId, email }) {
  await chrome.storage.local.set({
    [CONFIG_KEY]: { token, baseUrl, userId, email, pairedAt: Date.now() },
  });
}

export async function clearPairing() {
  await chrome.storage.local.remove([CONFIG_KEY, SUMMARY_KEY]);
}

export async function getLastSyncSummary() {
  const { [SUMMARY_KEY]: s } = await chrome.storage.local.get(SUMMARY_KEY);
  return s ?? null;
}

export async function setChainResult(slug, result) {
  const existing = (await getLastSyncSummary()) ?? {};
  existing[slug] = { ...result, at: Date.now() };
  existing._at = Date.now();
  await chrome.storage.local.set({ [SUMMARY_KEY]: existing });
}
