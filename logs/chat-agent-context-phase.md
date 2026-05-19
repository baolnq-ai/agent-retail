# Chat agent context phase log

Time: 2026-05-18

- Added min-price parsing in catalog search so requests like `trên 7tr` no longer become accidental max-price searches.
- Changed chat intent detection to distinguish recommendation, comparison, policy, cart action, cart status, detail, and smalltalk contexts.
- Stopped prioritizing cart items when the user asks for new recommendations; cart context is now included only for cart-related intents or completed cart actions.
- Product cards are now suppressed for policy/smalltalk/cart-status contexts and shown only when recommendation/detail/compare/cart-action contexts need them.
- Quick replies are now intent-aware instead of always pushing stale add/compare/policy suggestions.
- Validation passed:
  - `corepack pnpm --filter @retail-agent/api typecheck`
  - `corepack pnpm --filter @retail-agent/api test`
