# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in SolVault Messenger, please report it responsibly:

**Email:** contact@treasurium.ai

Please do NOT:
- Open a public GitHub issue for security vulnerabilities
- Post vulnerability details on social media
- Exploit the vulnerability against other users

We will acknowledge your report within 48 hours and work to release a fix as quickly as possible.

## Scope

The following are in scope for security reports:
- Encryption implementation flaws
- Private key exposure risks
- Message decryption by unintended parties
- Local storage security bypasses
- Biometric lock bypasses

## Encryption Details

SolVault uses:
- NaCl box (X25519 + XSalsa20 + Poly1305) for message encryption
- Ed25519 to X25519 key conversion via tweetnacl
- SQLCipher (AES-256) for local database encryption
- Android Keystore / iOS Secure Enclave for key storage
