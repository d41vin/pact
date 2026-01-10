# XMTP v5 (MLS) Integration Debug Log

This document summarizes the technical challenges and solutions found during the implementation of XMTP messaging using the `@xmtp/browser-sdk` v5.

## 1. Signature Recovery (SCW vs EOA)
- **Issue**: XMTP requires specific signature formats for identity verification. EOAs typically need `v` parameter normalization, while Smart Contract Wallets (SCW) require the full signature and sometimes specific chain ID handling.
- **Solution**: Implemented dynamic signature recovery using `viem`. For EOAs, we recover the signer address and normalize `v = 27 | 28`. For SCWs, we provide the raw signature.

## 2. Message Delivery (The "Ghost DM" Problem)
- **Issue**: Calling `client.conversations.newDm(peerAddress)` was creating local conversation objects that were not consistently resolving to the network's actual InboxID for that peer.
- **Solution**: Use `client.conversations.newDmWithIdentifier({ identifier: address, identifierKind: "Ethereum" })`. This forces the SDK to perform a network lookup and resolve the actual `InboxID` before creating the conversation, ensuring delivery.

## 3. Inbox ID vs Address
- **Issue**: Local state and URLs were sometimes using Ethereum addresses, while the SDK v5 (MLS) requires 64-character hex InboxIDs. Mixing these caused "Conversation not found" errors.
- **Solution**: Standardized on using full `peerInboxId`. Created a `cleanInboxId` helper to strip common prefixes (like `0x` or `address:`) and ensure consistency across database and UI.

## 4. Async Method as Property
- **Issue**: In SDK v5, many fields like `dm.peerInboxId` are async **methods**, not properties. Accessing them as `dm.peerInboxId` resulted in stringified function bodies instead of the actual ID.
- **Solution**: Always use `await dm.peerInboxId()`.

## 5. BigInt Conversion (Environment Bug)
- **Issue**: Passing `limit: 50` or `limit: BigInt(50)` to `dm.messages()` caused a "Cannot convert 50 to a BigInt" crash in certain Turbopack/WASM environments.
- **Solution**: Removed the `limit` parameter. The SDK uses a sensible default, and bypassing the explicit conversion avoids the bug in the WASM binding layer.

## 6. Consent Syncing WASM Crash
- **Issue**: `setConsentStates` failed with "Cannot read properties of undefined (reading 'length')" because it expected an `entity` field, but we were passing `entityId`.
- **Solution**: Updated the batch object structure to `{ entity, entityType, state }` to match the `SafeConsent` type expected by the WASM binding.

## 7. Stream Handling
- **Issue**: `onValue` in `streamAllMessages` was not `async`, preventing internal calls to async methods like `peerInboxId()`.
- **Solution**: Marked the `onValue` callback as `async`.
