# IP Redactor

A tiny Chrome extension that blurs IP addresses on any web page so they don't leak into screen recordings, screenshots, or live demos.

Toggle on before you hit record. Toggle off when you're done.

## Why

When recording tutorials, walkthroughs, or doing live demos of cloud consoles, terminals, or admin panels, public and private IP addresses are usually visible — in tables, console output, status panels, etc. Manually editing them out of every video is tedious; this extension hides them at render time so the original recording is already clean.

## Install (load unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the project folder.
5. Pin the extension to your toolbar.

## Usage

- Click the toolbar icon to toggle redaction. The badge shows `ON` (red) when active.
- Refresh any tab opened before installing the extension so the content script can attach.
- Detected IPs are wrapped in a span and blurred via CSS. Toggling on/off is instant — no page re-scan.

## What it detects

- **IPv4** — including CIDR suffix (e.g. `10.0.0.1/24`).
- **IPv6** — full form (`fe80:0:0:0:1:2:3:4`) and `::` compressed form (`2001:db8::1`).
- **Inputs / textareas** — the whole field is blurred when its value matches.
- **Dynamic content** — a `MutationObserver` re-scans DOM that's added after page load (terminal output, streamed logs, etc.).

## What it doesn't detect

- IPs rendered into `<canvas>`, SVG `<text>`, or images. Many monitoring/status dashboards do this — verify on your target page before recording.
- IPs inside cross-origin sandboxed iframes that block extensions.
- Hostnames that resolve to IPs (only literal IP strings are matched).
- The `<code>` tag is skipped by default to avoid mangling code samples. Edit `SKIP_TAGS` in `content.js` if you want code blocks redacted too.

## Tuning

- **Blur intensity** — change `filter: blur(Npx)` in `styles.css`. Default is `3px`. Try `2px` for a softer look or `4–5px` for heavier.
- **Detection scope** — adjust the `IPV4` / `IPV6_*` regexes in `content.js`. The IPv6 regex requires 4+ segments to dodge false positives on time strings (`12:34:56`).
- **False positives** — IPv4 will match version strings like `1.2.3.4`. For recording, over-redaction is the safer default; tighten the regex if it bothers you.

## File layout

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest. |
| `content.js` | DOM walker, regex matching, mutation observer, input handler. |
| `background.js` | Service worker — handles toolbar click, persists state, broadcasts to tabs. |
| `styles.css` | Blur + redaction styling, gated on `html.ip-redact-on`. |

## License

MIT
