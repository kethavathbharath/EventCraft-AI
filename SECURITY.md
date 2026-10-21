# Security notes

**Threats considered and mitigations**

| Threat | Mitigation |
|---|---|
| XSS from user or AI text | Never uses `innerHTML`; all text is added via text nodes (`h()` helper). Test: "renders text, never markup". |
| Malformed or malicious input | Client-side validation of date (future), guests (1-5000), budget (₹1,000-₹10 crore), city; text fields stripped of `<>` and length-limited. |
| Prompt injection | User text is JSON-encoded as data inside a fixed instruction; the model is told to refuse off-topic requests and to return strict JSON only. |
| Untrusted AI output | Output parsed as JSON, types checked, lengths capped, budget multipliers clamped to 0.5-1.5 and applied only to known categories. |
| Secret leakage | No API keys exist in the page; AI calls go through the host runtime. |
| Data privacy | Plans are stored only in the viewer's own browser (`localStorage`) and can be cleared with one button. |
| Dependencies | Zero runtime dependencies; dev tooling is current (npm audit: 0 vulnerabilities); CI runs `npm audit`. |

**Out of scope for this demo:** server-side rate limiting and authentication (there is no server).
