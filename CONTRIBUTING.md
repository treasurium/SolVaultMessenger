# Contributing to SolVault Messenger

Thank you for your interest in contributing to SolVault Messenger.

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## Guidelines

- All code must maintain the zero-backend architecture — no centralized dependencies
- All message content must remain end-to-end encrypted
- Private keys must never be logged, transmitted, or stored insecurely
- All new dependencies must be React Native compatible (no Node.js-only modules)
- Use tweetnacl for all cryptographic operations (pure JS, no native crypto)

## Security

- Never commit API keys, private keys, seed phrases, or secrets
- If you find a security vulnerability, email contact@treasurium.ai privately
- Do NOT open public issues for security vulnerabilities

## Code of Conduct

Be respectful. This project exists to protect people's privacy and freedom of communication. Contributions that undermine these goals will not be accepted.
