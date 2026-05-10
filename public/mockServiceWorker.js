/* eslint-disable */
/**
 * Mock Service Worker (2.x) — generated for PointStash.
 *
 * This worker is loaded by msw/browser when NEXT_PUBLIC_ENABLE_MSW=1 so the
 * frontend can run against the seeded fixtures without a database.
 *
 * Regenerate with `npm run msw:init` if you upgrade msw and the protocol
 * changes. Do not edit by hand.
 */

const PACKAGE_VERSION = "2.7.0";
const INTEGRITY_CHECKSUM = "26357c79639bfa20d64c0efca2a87423";
const IS_MOCKED_RESPONSE = Symbol("isMockedResponse");
const activeClientIds = new Set();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", async (event) => {
  const clientId = event.source.id;
  if (!clientId || !self.clients) return;
  const client = await self.clients.get(clientId);
  if (!client) return;
  const allClients = await self.clients.matchAll({ type: "window" });

  switch (event.data) {
    case "KEEPALIVE_REQUEST":
      sendToClient(client, { type: "KEEPALIVE_RESPONSE" });
      break;
    case "INTEGRITY_CHECK_REQUEST":
      sendToClient(client, {
        type: "INTEGRITY_CHECK_RESPONSE",
        payload: { packageVersion: PACKAGE_VERSION, checksum: INTEGRITY_CHECKSUM },
      });
      break;
    case "MOCK_ACTIVATE":
      activeClientIds.add(clientId);
      sendToClient(client, { type: "MOCKING_ENABLED", payload: true });
      break;
    case "MOCK_DEACTIVATE":
      activeClientIds.delete(clientId);
      break;
    case "CLIENT_CLOSED": {
      activeClientIds.delete(clientId);
      const remainingClients = allClients.filter((c) => c.id !== clientId);
      if (remainingClients.length === 0) self.registration.unregister();
      break;
    }
  }
});

self.addEventListener("fetch", function (event) {
  const { request } = event;
  if (request.mode === "navigate") return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
  if (activeClientIds.size === 0) return;

  const requestId = crypto.randomUUID();
  event.respondWith(handleRequest(event, requestId));
});

async function handleRequest(event, requestId) {
  const client = await resolveMainClient(event);
  const response = await getResponse(event, client, requestId);
  if (client && activeClientIds.has(client.id)) {
    (async () => {
      const clonedResponse = response.clone();
      sendToClient(
        client,
        {
          type: "RESPONSE",
          payload: {
            requestId,
            isMockedResponse: IS_MOCKED_RESPONSE in response,
            type: clonedResponse.type,
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            body: clonedResponse.body,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          },
        },
        [clonedResponse.body],
      );
    })();
  }
  return response;
}

async function resolveMainClient(event) {
  const client = await self.clients.get(event.clientId);
  if (client?.frameType === "top-level") return client;
  const allClients = await self.clients.matchAll({ type: "window" });
  return allClients
    .filter((c) => c.visibilityState === "visible")
    .find((c) => activeClientIds.has(c.id));
}

async function getResponse(event, client, requestId) {
  const { request } = event;
  const requestClone = request.clone();

  function passthrough() {
    const headers = new Headers(requestClone.headers);
    headers.delete("accept", "msw/passthrough");
    return fetch(requestClone, { headers });
  }

  if (!client) return passthrough();
  if (!activeClientIds.has(client.id)) return passthrough();

  const requestBuffer = await request.clone().arrayBuffer();
  const clientMessage = await sendToClient(
    client,
    {
      type: "REQUEST",
      payload: {
        id: requestId,
        url: request.url,
        mode: request.mode,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        cache: request.cache,
        credentials: request.credentials,
        destination: request.destination,
        integrity: request.integrity,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        body: requestBuffer,
        keepalive: request.keepalive,
      },
    },
    [requestBuffer],
  );

  switch (clientMessage.type) {
    case "MOCK_RESPONSE":
      return respondWithMock(clientMessage.data);
    case "PASSTHROUGH":
      return passthrough();
  }
  return passthrough();
}

function sendToClient(client, message, transferrables = []) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) reject(event.data.error);
      else resolve(event.data);
    };
    client.postMessage(message, [channel.port2, ...transferrables.filter(Boolean)]);
  });
}

async function respondWithMock(response) {
  if (response.status === 0) return Response.error();
  const mockedResponse = new Response(response.body, response);
  Reflect.defineProperty(mockedResponse, IS_MOCKED_RESPONSE, {
    value: true,
    enumerable: true,
  });
  return mockedResponse;
}
