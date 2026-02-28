# Changelog

All notable changes to SolVault Messenger are documented here. Versions are numbered progressively with each release.

## [1.0.0] - v11 - 2026-02-28

### Added
- Custom SolVault branding throughout the app
- Circular logo SVG on Welcome screen (replaces emoji placeholder)
- App icon SVG on loading screen with branded spinner
- Custom Android launcher icon (shield + chat bubbles) at all densities

### Changed
- Welcome screen hero section uses `SolVaultLogo` component via react-native-svg
- Loading screen displays `SolVaultAppIcon` above the activity indicator

---

## [0.9.0] - v10 - 2026-02-28

### Added
- WebSocket subscriptions via Solana `connection.onLogs()` for real-time message delivery
- Optimistic sent message display — messages appear instantly with "Sending..." status
- `subscriptionService.ts` — manages WebSocket lifecycle for conversations
- WSS endpoints configured for all RPC providers (mainnet + devnet)

### Changed
- Polling interval reduced from 5s to 20s (WebSocket is now primary)
- Chat store gains `subscribeToChat` / `unsubscribeFromChat` actions
- ConversationScreen subscribes on mount, unsubscribes on unmount
- Pending messages render with reduced opacity and inline spinner

---

## [0.8.0] - v9 - 2026-02-28

### Fixed
- **"missing required signature for instruction"** — Memo Program requires ALL accounts to be signers; removed recipient from instruction keys
- Recipient public key is now embedded inside the encrypted payload instead of as a transaction account

### Changed
- Wire format updated to `[version:1B][recipientPubKey:32B][nonce:24B][ciphertext:varB]`
- Added `extractRecipientFromPayload()` to identify message recipients from payload data
- `fetchOnChainMessages` matches conversations by embedded recipient pubkey

---

## [0.7.0] - v8 - 2026-02-28

### Fixed
- **"Cannot read property 'createHash' of undefined"** — Node.js `crypto` module does not exist in React Native
- Replaced `import {createHash} from 'crypto'` with `nacl.hash()` (pure JS SHA-512 from tweetnacl)

---

## [0.6.0] - v7 - 2026-02-28

### Changed
- Switched from devnet to **Solana mainnet** (`USE_DEVNET: false`)

---

## [0.5.0] - v6 - 2026-02-28

### Added
- **End-to-end encryption** using Ed25519-to-X25519 key conversion
  - `ed25519SecretToX25519()` — SHA-512 hash + clamp for secret key conversion
  - `ed25519PublicToX25519()` — BigInt `(1+y)/(1-y) mod p` for public key conversion
  - NaCl box encryption (X25519 + XSalsa20-Poly1305)
- **On-chain message fetching** — scan both wallets' transaction history via `getSignaturesForAddress`
- **Encrypted read receipts** — on-chain acknowledgments with `READ_RECEIPT_VERSION = 0x02`
- Read status indicators: single grey check (sent), double grey check (delivered), double blue check (read)
- `read_status` column in messages table
- `read_receipts_sent` tracking table
- `MESSAGE_VERSION = 0x01` and `READ_RECEIPT_VERSION = 0x02` constants

### Changed
- `encryptionService.ts` completely rewritten for Ed25519-to-X25519 protocol
- `messageService.ts` rewritten with `fetchOnChainMessages()` and `sendReadReceipts()`
- `chatStore.ts` updated to use on-chain fetching instead of backend relay
- `ConversationScreen.tsx` updated with checkmark status indicators and 5s polling

---

## [0.4.0] - v5 - 2026-02-28

### Fixed
- **"Recipient not found in directory"** — removed backend dependency for sending messages
- Messages can now be sent to any valid Solana address without requiring recipient registration

### Changed
- Encryption made optional — if recipient not registered, send plaintext memo
- Backend relay made best-effort (fire-and-forget)

---

## [0.3.0] - v4 - 2026-02-28

### Fixed
- "Show Recovery Phrase" in Settings now displays the actual mnemonic instead of "Coming Soon"
- Wired up `retrieveMnemonic()` from `mnemonicService.ts` in SettingsScreen

---

## [0.2.0] - v3 - 2026-02-28

### Fixed
- **"Unable to load script"** — debug APK did not embed JS bundle
- Manually bundle JS with `npx react-native bundle` for standalone APK

### Added
- Node.js polyfills for React Native: `stream-browserify`, `crypto-browserify`, `string_decoder`, `events`, `process`
- `metro.config.js` with `extraNodeModules` mapping for Node built-ins
- `empty-module.js` stubs for unused Node modules (`vm`, `http`, `https`, `os`, `fs`, etc.)

---

## [0.1.1] - v2 - 2026-02-28

### Fixed
- Backend URL hardcoded to Railway production URL (debug builds were using localhost due to `__DEV__`)

---

## [0.1.0] - v1 - 2026-02-28

### Added
- Initial release of SolVault Messenger
- React Native 0.84 with TypeScript
- Non-custodial Solana wallet (BIP39 mnemonic, BIP44 derivation)
- Wallet creation and import flows
- SOL balance display, deposit QR code, and send SOL
- Basic messaging UI with conversation list and chat screen
- Backend integration for user directory and message relay
- Settings screen with network toggle, recovery phrase, and logout
- Dark theme UI throughout
- Deployed backend to Railway with PostgreSQL
