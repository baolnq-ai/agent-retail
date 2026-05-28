# Plan: Frontend production redesign and runtime model config

Time: 2026-05-21

## Goal

Make RetailHome feel like a production retail storefront while keeping model/runtime diagnostics available for development. Also make model configuration visible and testable so `.env`, setup, runtime memory, and UI settings are not confused.

## Phases

1. Runtime model config hardening
   - Align defaults to `https://replace-with-your-vllm-gateway.example.invalid`, `google/gemma-4-E4B-it`, and `https://replace-with-your-embed-rerank-gateway.example.invalid`.
   - Print effective model config during setup.
   - Warn when shell env overrides `.env` model values.
   - Expose model settings source as `runtime-memory` without exposing API key.

2. Model diagnostics and no-fallback chat
   - Check `GET /v1/models`, `POST /v1/chat/completions`, `POST /api/v1/embed`, and `POST /api/v1/rerank` separately.
   - Remove customer-facing `safe-fallback` final answers.
   - Surface model failures as real errors.

3. Retail navigation and chat tools
   - Remove dashboard/settings from primary shopping nav.
   - Keep dashboard available from the chat widget with `Má»Ÿ dashboard` opening `/agent-dashboard` in a new tab.
   - Replace internal chat progress labels with shopper-friendly labels.

4. Storefront redesign
   - Rewrite homepage copy as customer benefits.
   - Add real category filter links and result count on catalog.
   - Add breadcrumb, trust badges, and specs grouping on product detail.
   - Reduce heavy dashboard panel styling and oversized headings.

5. Verification
   - Run typecheck, unit tests, build, runtime tests, and manual HTTP/user-flow checks.
   - Verify settings ping uses submitted form values and chat uses a real model response without fallback.
