# VELNIX EXTRACTOR PRO

A small Node/Express application for authorized Xtream API access.

## Deploy on Render
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Node.js: 20 or newer
- Health endpoint: `/health`

## Features
- Account/API connection check
- Live categories and channel extraction
- M3U/M3U8, TXT, CSV, and JSON exports
- Local M3U/M3U8 file import and filtering

## Security
- Credentials are sent to this app and forwarded to the provider entered by the user; they are not persisted or logged by the application.
- Only account info, live categories, live streams, and M3U playlist endpoints are accepted.
- Private/reserved IPv4 targets are blocked, DNS is validated and pinned for upstream requests, redirects are refused, and response sizes/timeouts are limited.
- API requests are rate-limited. Use only subscriptions and endpoints you are authorized to access.
- Exported stream URLs can contain subscription credentials. Keep them private.
