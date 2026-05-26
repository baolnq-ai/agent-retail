# Frontend Evidence

These screenshots were captured through Chrome DevTools Protocol against the real web app at `http://127.0.0.1:7000`.

| Screenshot | Proves |
| --- | --- |
| `01-chat-open-ready.png` | Chat opens with initial suggestions. |
| `02-chat-loading-status-wave.png` | Loading/status state is visible with animated dots. |
| `03-chat-product-suggestions-and-replies.png` | Product answer shows product rail and quick replies in the chat UI. |
| `04-chat-policy-source-and-replies.png` | Policy answer shows policy source cards and a relevant quick reply. |
| `05-chat-safety-bounded-reply.png` | Prompt-injection style request is answered inside RetailHome scope. |

CDP audit file: `../frontend-dashboard-cdp-audit.json`.
