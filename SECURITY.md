# Security notes

This project uses layered controls but should still receive a deployment-specific security review before handling real health documents or money.

Implemented controls include private prescription storage, MIME + magic-byte validation, server-side authorization, role gates, secure password hashing, opaque hashed sessions, HttpOnly cookies, same-origin checks for mutating browser APIs, Redis-backed auth rate limiting, server-side Zod validation, serializable checkout, stock compare-and-decrement, audit logs, forward-only fulfillment transitions, and response security headers.

Production owners should additionally configure malware scanning for uploads, secret rotation, least-privilege cloud IAM, encrypted backups, observability, incident response, CSP tuned to the final payment/analytics providers, privacy retention/deletion workflows, penetration testing, dependency scanning, and legal/compliance controls for the operating jurisdiction.

Do not use the seeded credentials or catalog as production data.
