## 📘 XMTP Browser SDK – Curated Reference for 1-to-1 DM MVP

This file extracts the essential XMTP Browser SDK APIs and patterns for building a **simple browser-based 1-to-1 direct messaging (DM) feature**.
It is self-contained and excludes groups, notifications, backend servers, and protocol internals.

---

### 📌 1. Installation

Install the official XMTP Browser SDK and the reaction content type codec:

```bash
npm install @xmtp/browser-sdk @xmtp/content-type-reaction
```

This installs the browser-optimized client and reaction codec. ([docs.xmtp.org][2])

---

### 📌 2. Creating the XMTP Client

Use a wallet signer (e.g., MetaMask, Wagmi) to create the XMTP client in the browser:

```ts
import { Client, type Signer } from "@xmtp/browser-sdk";
import { ReactionCodec } from "@xmtp/content-type-reaction";

const signer: Signer = {
  type: "EOA",
  getIdentifier: () => ({ identifier: "0xYourAddress", identifierKind: "Ethereum" }),
  signMessage: async (msg) => {
    // convert signed hex to Uint8Array
  },
};

const client = await Client.create(signer, {
  env: "production",     // or 'dev'/'local'
  codecs: [new ReactionCodec()],
  // dbEncryptionKey is ignored in browser environments
});

// The client now has an associated Inbox ID
console.log("Inbox ID:", client.inboxId);
```

Notes:

* Browsers use unencrypted local storage for messages; `dbEncryptionKey` is ignored.
* Use HTTPS to secure wallet interactions. ([docs.xmtp.org][1])

---

### 📌 3. Starting and Looking Up DM Conversations

First, you can verify that a peer is reachable on the XMTP network:

```ts
import type { Identifier } from "@xmtp/browser-sdk";

const identifiers: Identifier[] = [
  { identifier: "0xPeerAddress", identifierKind: "Ethereum" },
];

const reachable = await Client.canMessage(identifiers);
// reachable is a Map<string, boolean>
```

Then create or look up a DM by inbox ID or identifier:

```ts
const dm = await client.conversations.newDm(peerInboxId);

// Or lookup if an existing DM exists
const dmByInbox = await client.conversations.getDmByInboxId(peerInboxId);
const dmByIdentifier = await client.conversations.getDmByIdentifier(identifiers[0]);
```

The `canMessage` method checks if a peer is contactable before creating a DM. ([docs.xmtp.org][3])

---

### 📌 4. Sending and Receiving Messages

**Sending a text message:**

```ts
await dm.send("Hello!");
```

**Streaming real-time and catch-up messages:**

```ts
const stream = await client.conversations.streamAllMessages({
  consentStates: ["Allowed"],
  onValue: (msg) => console.log("New message:", msg),
  onError: (error) => console.error(error),
});

// Or use a `for await` loop
for await (const msg of stream) {
  console.log("Streamed message:", msg);
}
```

**Fetching message history:**

```ts
const history = await dm.messages({ limit: 50 });
```

Notes:

* Streaming delivers both new and missed messages (catch-up).
* Filtering by allowed consent avoids unwanted messages. ([docs.xmtp.org][4])

---

### 📌 5. Listing All DMs

Get all direct message conversations for the logged-in user:

```ts
const allDms = await client.conversations.listDms({
  consentStates: ["Allowed"],
});

allDms.forEach((dm) => console.log(dm.peerInboxId));
```

Filtering by `consentStates` ensures only allowed conversations are shown. ([docs.xmtp.org][2])

---

### 📌 6. User Consent

XMTP supports user consent preferences (Allowed / Unknown / Denied). Use official SDK calls to get or set consent:

```ts
import { ConsentEntityType, ConsentState } from "@xmtp/browser-sdk";

// Get the consent state for a peer
const state = await client.getConsentState(ConsentEntityType.InboxId, peerInboxId);

// Set consent to Allowed
await client.setConsentStates([
  { entityId: peerInboxId, entityType: ConsentEntityType.InboxId, state: ConsentState.Allowed },
]);

// Stream consent updates
const consentStream = await client.preferences.streamConsent({
  onValue: (updates) => console.log("Consent updates:", updates),
});
```

Notes:

* Consent filtering affects what conversations and messages are visible.
* Unknown consent can be treated as “message request” in UX. ([docs.xmtp.org][5])

---

### 📌 7. Sending and Receiving Reactions

Include reactions via the dedicated content type:

```ts
import { ContentTypeReaction } from "@xmtp/content-type-reaction";

// Send a reaction
await dm.send(
  {
    reference: messageId,
    action: "added",
    content: "👍",
    schema: "unicode",
  },
  { contentType: ContentTypeReaction }
);

// Receive reactions in streams
if (message.contentType.sameAs(ContentTypeReaction)) {
  const reaction = message.content;
  console.log(`Reaction '${reaction.content}' to '${reaction.reference}'`);
}
```

Notes:

* Register `ReactionCodec` when creating the client so reactions are decoded properly. ([docs.xmtp.org][2])

---

### 📌 8. Summary of Browser SDK Usage

This reference covers only the XMTP Browser SDK APIs and patterns required for a **1-to-1 DM MVP**:

* Install the browser SDK and reaction codec
* Create a client with a wallet signer
* Check peer reachability and create DMs
* Send and stream text messages
* List DMs filtered by consent
* Manage consent preferences
* Send/receive reactions

Use these verified APIs to ensure implementation accuracy.

---

## 📌 Sources

* XMTP Browser SDK quickstart and API docs: [https://docs.xmtp.org/chat-apps/sdks/browser](https://docs.xmtp.org/chat-apps/sdks/browser) ([docs.xmtp.org][2])
* Create client guide: [https://docs.xmtp.org/chat-apps/core-messaging/create-a-client](https://docs.xmtp.org/chat-apps/core-messaging/create-a-client) ([docs.xmtp.org][1])
* Create conversations (including `canMessage` and DM helpers): [https://docs.xmtp.org/chat-apps/core-messaging/create-conversations](https://docs.xmtp.org/chat-apps/core-messaging/create-conversations) ([docs.xmtp.org][3])
* Streaming API details: [https://docs.xmtp.org/chat-apps/list-stream-sync/stream](https://docs.xmtp.org/chat-apps/list-stream-sync/stream) ([docs.xmtp.org][4])
* Consent examples: [https://docs.xmtp.org/chat-apps/user-consent/support-user-consent](https://docs.xmtp.org/chat-apps/user-consent/support-user-consent) ([docs.xmtp.org][5])

---