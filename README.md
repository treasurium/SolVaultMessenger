# SolVault Messenger

Non-custodial encrypted messaging with a built-in Solana wallet.

## Features

- **End-to-End Encryption** — Messages are encrypted using NaCl box (X25519 + XSalsa20-Poly1305) via Ed25519-to-X25519 key conversion from your Solana wallet keys. Zero key material on-chain.
- **On-Chain Messages** — All messages are stored as encrypted Solana Memo transactions. No centralized server stores your messages.
- **Non-Custodial Wallet** — You own your keys. BIP39 mnemonic generation, BIP44 derivation path (`m/44'/501'/0'/0'`), compatible with Phantom and Solflare.
- **Send & Receive SOL** — Built-in wallet with balance display, deposit QR code, and SOL transfer.
- **On-Chain Read Receipts** — Encrypted read receipts are sent as Memo transactions. See sent, delivered, and read status.
- **Real-Time Delivery** — WebSocket subscriptions via Solana `onLogs` for near-instant message detection, with fallback polling.
- **Optimistic UI** — Sent messages appear instantly with a "Sending..." indicator while the transaction confirms on-chain.

## Architecture

```
src/
  app/              — App entry point, navigation, providers
  config/           — Environment config, RPC endpoints
  core/
    solana/         — Connection management, constants
    storage/        — SQLite database layer
  features/
    auth/           — Onboarding, wallet creation/import, settings
    messaging/      — Conversation UI, encryption, memo transactions, WebSocket subscriptions
    wallet/         — Balance, deposit, send SOL, keypair management
  shared/           — Reusable components, utilities, types
  stores/           — Zustand state management (auth, wallet, chat)
```

## Encryption Protocol

1. Sender's Ed25519 secret key is converted to X25519 via SHA-512 hash + clamping
2. Recipient's Ed25519 public key is converted to X25519 via `u = (1+y)/(1-y) mod p`
3. NaCl `box` encrypts the message with the X25519 shared secret
4. Wire format: `[version:1B][recipientPubKey:32B][nonce:24B][ciphertext:varB]`
5. The encrypted payload is sent as a Solana Memo transaction
6. Only the sender and recipient can decrypt — all done client-side with pure JS (tweetnacl)

## Tech Stack

- React Native 0.84
- TypeScript
- Solana web3.js v1
- tweetnacl (pure JS NaCl)
- Zustand (state management)
- react-native-svg
- SQLite (local message storage)

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Android SDK (for Android builds)

### Install

```sh
git clone https://github.com/treasurium/SolVaultMessenger.git
cd SolVaultMessenger
npm install
```

### Run (Development)

```sh
# Start Metro bundler
npm start

# Build and run on Android
npm run android
```

### Build APK (Standalone)

```sh
# Bundle JS
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# Build APK
cd android && ./gradlew assembleDebug
```

The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Backend

The companion backend is at [treasurium/SolVaultMessenger-backend](https://github.com/treasurium/SolVaultMessenger-backend). It provides:
- User directory (wallet address registration)
- Push notification relay
- JWT authentication with Ed25519 signature verification

The backend is **not required** for core messaging — messages are fetched directly from Solana on-chain transaction history.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and release notes.

Current version: **1.0.0** (v11)

## License

All rights reserved.
