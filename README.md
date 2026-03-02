# SolVault Messenger

**Encrypted On-Chain Messaging on Solana**

The world's first fully decentralized messenger. No servers. No accounts. No censorship. Just cryptography.

Built by [Treasurium.ai](https://treasurium.ai) | Sponsored by [BitUnix](https://www.bitunix.com/register?vipCode=TreasuriumAICorp)

---

## What is SolVault?

SolVault Messenger is an open-source, end-to-end encrypted messaging app built entirely on the Solana blockchain. Every message is an on-chain transaction — permanent, immutable, and uncensorable. There are no servers, no databases, and no centralized infrastructure of any kind.

**Your 12-word seed phrase is your identity.** Lose your phone, buy a new one, enter your 12 words, and every message you've ever sent or received is recovered from the blockchain. No backup needed. No cloud required.

## Why SolVault?

| Feature | SolVault | Signal | Telegram | WhatsApp | XMTP |
|---------|----------|--------|----------|----------|------|
| End-to-end encrypted | Yes | Yes | No | Yes | Yes |
| No central server | Yes | No | No | No | No |
| Messages on-chain | Yes | No | No | No | No |
| 12-word recovery | Yes | No | No | No | No |
| In-chat payments | Yes | No | No | No | No |
| No phone/email required | Yes | No | No | No | Yes |
| Censorship resistant | Yes | No | No | No | Partial |
| Fully open source | Yes | Yes | No | No | Yes |

## Features

### Encrypted Messaging
- NaCl box encryption (X25519 + XSalsa20 + Poly1305)
- Messages stored as Solana Memo transactions — permanent and tamper-proof
- Read receipts (sent, delivered, read) — encrypted on-chain
- Real-time WebSocket delivery (1-3 seconds)
- Auto-reconnect with exponential backoff and polling fallback

### Multi-Token Wallet
- SOL, USDC, and USDT support
- Real-time USD portfolio value via Jupiter API
- QR code deposit, address validation, fee estimation
- Full on-chain transaction history

### In-Chat Payments
- Send SOL, USDC, or USDT directly in any conversation
- Encrypted payment details on-chain
- Styled payment bubbles with token logos and Solana Explorer links

### Security
- Self-custodial — private keys never leave your device
- 12-word BIP39 recovery (compatible with Phantom, Solflare, etc.)
- Hardware-backed secure storage (Android Keystore / iOS Secure Enclave)
- Biometric lock with auto-lock on background
- SQLCipher encrypted local database (AES-256)
- No accounts, no registration, no phone number, no email
- Zero backend infrastructure — fully peer-to-peer via Solana

### Censorship Resistance
- Zero centralized servers or infrastructure
- Multi-RPC fallback — automatically rotates between Solana endpoints
- User-configurable custom RPC endpoint in Settings
- Only way to stop SolVault is to shut down the entire Solana blockchain

## Architecture

```
[Device A] → (encrypted memo tx) → [Solana Blockchain] → (WebSocket) → [Device B]
     ↓                                      ↑
  Local encrypted                     Thousands of
  storage only                      decentralized nodes
                                     (uncensorable)
```

No backend. No static IP. No single point of failure.

```
src/
  app/              — App entry point, navigation, providers
  config/           — RPC endpoints, custom RPC storage
  core/
    solana/         — Connection management, constants
    crypto/         — NaCl encryption primitives
    storage/        — SQLCipher database, secure storage
  features/
    auth/           — Onboarding, settings, biometric lock
    contacts/       — Contact management (local-only)
    messaging/      — Conversations, encryption, memo transactions, WebSocket
    wallet/         — Multi-token balances, send/receive, transaction history
  shared/           — Reusable components, utilities, types
  stores/           — Zustand state management (auth, wallet, chat, contacts)
```

## Encryption Protocol

1. Sender's Ed25519 secret key is converted to X25519 via SHA-512 hash + clamping
2. Recipient's Ed25519 public key is converted to X25519 via `u = (1+y)/(1-y) mod p`
3. NaCl `box` encrypts the message with the X25519 shared secret
4. Wire format: `[version:1B][recipientPubKey:32B][nonce:24B][ciphertext:varB]`
5. The encrypted payload is sent as a Solana Memo transaction
6. Only the sender and recipient can decrypt — all done client-side with pure JS (tweetnacl)

## Building from Source

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android) / Xcode (for iOS)
- A Solana RPC endpoint (public endpoints work, or use your own)

### Setup
```bash
git clone https://github.com/AiCreat0r/SolVaultMessenger.git
cd SolVaultMessenger
npm install
cd ios && pod install && cd ..  # iOS only
```

### Run
```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

### Build APK (Android)
```bash
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`

## Configuration

Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Available settings:
- `SOLANA_NETWORK` — `mainnet-beta` or `devnet`
- `CUSTOM_RPC_URL` — your own Solana RPC endpoint (optional)

All other configuration is done within the app's Settings screen.

## Tech Stack

- React Native 0.84 + TypeScript
- Solana web3.js v1 + @solana/spl-token
- tweetnacl (pure JS NaCl encryption)
- Zustand (state management)
- SQLCipher (encrypted local database)
- react-native-keychain (hardware-backed secure storage)
- react-native-svg, react-native-safe-area-context

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

### Security Vulnerabilities
If you discover a security vulnerability, please report it responsibly by emailing contact@treasurium.ai. Do NOT open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for details.

## License

SolVault Messenger is licensed under the [GNU General Public License v3.0](LICENSE).

This means you can freely use, study, share, and modify this software. If you distribute a modified version, you must also make your source code available under the same license. This ensures that all forks of SolVault remain open and auditable — preventing anyone from hiding backdoors in a closed-source derivative.

## Disclaimer

SolVault Messenger is open-source cryptographic software provided as-is. The developers do not operate any servers, store any data, or have access to any user messages or private keys. This software is a tool for private communication. The developers are not responsible for how it is used. Use responsibly and in compliance with your local laws.

See [DISCLAIMER](DISCLAIMER) for full legal notice.

## Support the Project

SolVault Messenger is free, open-source software. If you find it useful, consider supporting development:

**Solana Wallet (SOL / USDC / USDT):**
```
6oNt9EBU6L64d1zqsH4WgmykpXsgfbj7rhZwDgVeNV4T
```

**Sign up with our sponsor:** [BitUnix](https://www.bitunix.com/register?vipCode=TreasuriumAICorp)

All donations go directly toward continued development, security audits, and keeping SolVault free for everyone.

---

**SolVault Messenger** — Your messages. Your keys. Your freedom.
