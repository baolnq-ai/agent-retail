# Provider source readiness checklist for AI Hub

Use this checklist before adding or updating any provider source repository in AI Hub. A provider is not ready until it can be installed from a fresh clone, run without port/process conflicts, execute its real business workflow, and delete cleanly without leaving provider-owned Docker artifacts behind.

## 1. Required source repository structure

Every provider source repository should contain enough information for Hub to clone, configure, run, stop, and delete it reproducibly.

Minimum expected files:

- `README.md`
  - Clear local setup instructions.
  - Required runtime tools: Docker, Docker Compose, Python/Node versions, GPU requirements if any.
  - Exact run/stop/clean commands.
  - Real feature test instructions, not just health checks.
- `.gitignore`
  - Must ignore `.env`, `.env.local`, generated logs, volumes, build output, cache folders, and runtime data.
  - Must not ignore required source/config templates.
- `.env.example`
  - Contains every required env key with safe placeholder values.
  - Must not contain real API keys, tokens, secrets, private hostnames, or user data.
  - Must document which keys are mandatory for real mode.
- Startup script, if the provider owns its own lifecycle.
  - Linux: `setup.sh`, `run.sh`, or equivalent.
  - Windows: `setup.ps1`, `run.ps1`, or equivalent if Windows support is required.
- Cleanup script, if the provider starts Docker, local services, or generated files.
  - Linux and Windows should both be covered when the provider supports both platforms.
- Docker files, if Docker is used.
  - `docker-compose.yaml` or compose files under a clearly documented path.
  - `Dockerfile` files for source-built services.
- Package/dependency files.
  - Python: `requirements.txt`, `pyproject.toml`, `uv.lock`, or equivalent.
  - Node: `package.json` and lockfile.
- Real test instructions or scripts.
  - At minimum, a documented curl/API/browser flow that proves the core feature works.
  - Prefer automated smoke scripts that Hub validation can run.

## 2. AI Hub wrapper requirements

For each provider added to Hub, verify the Hub-side provider wrapper contains:

- `providers/{provider_id}/aihub.provider.json`
  - Stable unique `id` matching folder name.
  - Correct display name and type.
  - Correct repository URL and branch.
  - Correct install directory under `deploy/`.
  - Accurate default port and health URL.
  - Accurate docs/UI URL if exposed.
  - Required config/env keys with descriptions.
- `providers/{provider_id}/scripts/windows/`
  - `setup.ps1`
  - `run.ps1`
  - `stop.ps1`
  - `delete.ps1`
  - `health.ps1` when applicable.
  - `metrics.ps1` when applicable.
- `providers/{provider_id}/scripts/linux/`
  - Equivalent scripts when Linux is supported.
- Wrapper scripts must pass Hub environment variables correctly:
  - `AIHUB_PROVIDER_ID`
  - `AIHUB_PROVIDER_ROOT`
  - `AIHUB_DEPLOY_ROOT`
  - `AIHUB_INSTALL_DIRECTORY`
  - `AIHUB_PORT`
  - `AIHUB_BRANCH`
  - Provider-specific config env values.
- Wrapper scripts must not hardcode absolute local paths.
- Wrapper scripts must not print secrets.

## 3. Secret and env rules

Security rules are mandatory.

- Never commit real secrets to provider source or Hub wrapper.
- Never print `.env`, `.env.local`, API keys, access tokens, cookies, or private credentials in logs.
- Validation may check only:
  - key exists or does not exist.
  - masked value.
  - value length.
  - pass/fail result.
- `.env.example` must be safe to publish.
- Provider startup must fail clearly when mandatory real-mode keys are missing.
- Provider must not silently switch to fake/mock/fallback mode when a real key is required.
- If a fallback mode exists for demos, it must be explicitly named and disabled for production/Hub validation.

## 4. Port and process isolation rules

Providers must not conflict with each other or with Hub.

- No fixed `container_name` in Docker Compose unless there is a strong reason and the name includes a unique project/provider prefix.
- Prefer no custom fixed Docker network name.
- Use Compose project isolation.
- Every host port must be configurable by env.
- Hub wrappers must be able to override provider ports.
- Avoid defaulting all providers to the same host ports.
- Before declaring pass, test when common ports are already occupied.
- Startup must not kill unrelated processes.
- Stop/delete must only stop processes and containers owned by the provider.
- PID files, if used, must live under the provider deploy/runtime directory.
- Frontend/dev servers must not be killed by provider install/run/delete.

## 5. Docker Compose requirements

For Compose-based providers:

- Compose services should avoid global names.
- Compose project name should be provider-specific and stable.
- Host ports should use env variables, for example `${API_PORT:-8000}:8000`.
- Volumes should be provider-scoped.
- Networks should be provider-scoped or compose-managed.
- Build contexts must be relative and valid from a fresh clone.
- Health checks should exist for long-running services when possible.
- Service readiness must wait for dependencies before reporting success.
- `docker compose config --quiet` should pass with expected env placeholders.
- Images built by the provider must be removable by delete/clean scripts.

## 6. Cleanup and delete requirements

Delete must clean all provider-owned runtime artifacts.

Mandatory cleanup targets:

- Running containers created by the provider.
- Stopped containers created by the provider.
- Compose networks created by the provider.
- Compose volumes created by the provider when delete is meant to reset the provider.
- Source-built provider images.
- Generated runtime config files.
- PID files.
- Logs under provider runtime directory when clean/delete requires a full reset.
- Temporary generated data under the provider deploy directory.

Docker Compose cleanup must use image removal:

```bash
docker compose down --volumes --remove-orphans --rmi all
```

or the equivalent through Hub shared helpers.

Do not use only:

```bash
docker compose down
```

Do not rely on only:

```bash
docker compose down --remove-orphans
```

Do not use `--rmi local` when provider service images may still remain. Use `--rmi all` for provider-owned compose images.

Delete must be idempotent:

- Running delete twice should not fail.
- Delete should succeed when the provider is partially installed.
- Delete should succeed when containers are already stopped.
- Delete should not fail if generated files are already gone.

Delete must not remove unrelated Docker resources:

- No global `docker system prune`.
- No global `docker image prune -a`.
- No deletion by broad image name patterns that can match another provider.
- No killing containers outside the provider compose project.

## 7. Install requirements

Install must be tested from a clean state.

Pre-install checks:

- Delete old deploy folder for that provider.
- Confirm no old provider containers remain.
- Confirm no source-built provider images remain when testing cleanup behavior.
- Confirm required env keys are present without printing values.

Install pass criteria:

- Hub clones the expected repository URL.
- Hub checks out the expected branch.
- Fresh clone commit matches the pushed provider commit when provider source was changed.
- Dependencies install without interactive prompts.
- Install works on Windows paths containing spaces.
- Install does not kill or restart Hub frontend/backend.
- Install does not require manual edits after clone except providing secrets/config through Hub/env.

## 8. Run requirements

Run pass criteria:

- Provider starts from fresh clone through Hub, not from a manually patched deploy directory.
- All required containers/processes become healthy or ready.
- Hub status reports `running` only after provider is actually usable.
- Health endpoint returns OK.
- Docs/UI endpoint works if the provider exposes one.
- Logs do not show fatal startup errors.
- Logs do not expose secrets.
- Runtime ports match Hub status/config.
- Provider can restart after stop.
- Provider can run again after delete and reinstall.

## 9. Real functionality validation

Health checks are not enough. Each provider must pass a real feature test.

A provider is not passed if it only:

- Starts containers.
- Returns `/health` OK.
- Shows a static UI.
- Returns a fallback response.
- Uses mock/demo data when real mode is required.
- Skips external API calls required by its advertised functionality.

Real validation must prove:

- The main user workflow executes successfully.
- Required external API calls work with real keys when the provider requires them.
- The response is specific to the request/data, not a canned fallback.
- Error logs do not show hidden exceptions while returning a friendly fallback.
- The UI can call the backend successfully when the provider includes a UI.

Suggested validation evidence:

- Request endpoint and status code.
- Short non-secret response preview.
- Whether fallback markers were detected.
- Relevant container health status.
- Provider-specific data ID used for test, if not sensitive.
- Confirmation that no secrets were printed.

## 10. Provider-specific real test examples

These examples should be adapted whenever provider APIs change.

### Shop Retail Provider

Required real tests:

- Install from fresh clone through Hub.
- Run through Hub.
- Verify UI/API health.
- Call real chain server query endpoint.
- Test guardrails off and guardrails on if supported.
- Confirm NVIDIA/API-backed response is not fallback.
- Confirm chat does not fail because API key is missing in container.
- Delete through Hub and verify containers/images are cleaned.

Example business assertion:

- User asks a retail shopping question.
- Response gives relevant clothing/accessory help.
- No `404`, timeout, fallback, or guardrail misconfiguration.

### AI Virtual Assistant Provider

Required real tests:

- Install from fresh clone through Hub.
- Verify clone commit equals latest pushed provider fix.
- Run through Hub.
- Verify `/agent/health`.
- Call `/agent/generate` with a real customer ID from seeded customer data.
- Confirm response includes actual order/product/return information.
- Detect and reject fallback strings.
- Check agent logs for hidden exceptions.
- Delete through Hub and verify cleanup.

Important failure class to prevent:

- SQL built with unquoted or unparameterized `user_id` can make PostgreSQL fail and trigger fallback responses. Customer/user IDs must be handled safely and parameterized.

### AI-Q

Required real tests:

- Fresh Hub install.
- Run all backend services.
- Verify document/index/retrieval services are ready.
- Submit a real query through the provider API/UI.
- Confirm retrieval/LLM response uses real backend path.
- Reject placeholder responses or static UI-only pass.
- Delete and verify Docker image cleanup.

### Nemotron Voice Agent Provider

Required real tests:

- Fresh Hub install.
- Run through Hub.
- Verify containers are healthy.
- Verify the actual runtime mode: WebRTC or WebSocket.
- If WebRTC mode:
  - Test `/offer` with a valid WebRTC client or scripted SDP flow.
  - Confirm audio/voice pipeline actually starts.
- If WebSocket mode:
  - Test `/health` and a real websocket stream.
- Do not mark 100% pass from container health alone.
- Delete and verify cleanup.

### Agentic Commerce Blueprint

Required real tests:

- Fresh Hub install.
- Run through Hub.
- Verify API/UI readiness.
- Execute a real commerce workflow.
- Confirm tools/agents call real services and return meaningful commerce results.
- Reject static response or dry-run-only success.
- Delete and verify cleanup.

### Multi-Agent Intelligent Warehouse

Required real tests:

- Fresh Hub install.
- Run through Hub.
- Verify API/UI readiness.
- Execute a real warehouse workflow, such as inventory, routing, or multi-agent planning.
- Confirm response reflects real provider state/data.
- Reject static dashboard-only success.
- Delete and verify cleanup.

### PDF-to-Podcast

Required real tests:

- Fresh Hub install.
- Run through Hub.
- Upload or provide a real PDF.
- Generate podcast output using real processing/TTS path.
- Confirm output audio file is created and non-empty.
- Confirm logs do not show fallback or placeholder generation.
- Delete and verify containers/images/volumes/generated runtime files are cleaned.

## 11. Source repo fix and push rule

If the problem is inside provider source, not just Hub wrapper:

1. Clone or use an existing clean clone of the provider source repo.
2. Fix the provider source there.
3. Run local syntax/config tests.
4. Run real provider functionality tests.
5. Commit the provider source change.
6. Push to that provider repo.
7. Delete Hub deploy copy.
8. Install again through Hub from fresh clone.
9. Verify the cloned commit equals the pushed commit.
10. Run real functionality again from the Hub-installed copy.
11. Only then mark the provider pass.

Do not mark pass from a manually patched `deploy/` folder unless the same fix has been pushed and fresh-installed through Hub.

## 12. Hub wrapper fix rule

If the issue is only in Hub wrapper scripts or manifests:

- Fix Hub wrapper under `providers/{provider_id}`.
- Run backend provider registry/lifecycle tests.
- Fresh install provider through Hub.
- Run real functionality.
- Delete through Hub.
- Verify cleanup.
- Commit Hub changes separately from provider source repo changes.

## 13. Required automated checks before accepting a provider

Run the relevant checks for the provider technology.

General:

- `git diff --check`
- Provider source status has no accidental generated files.
- Hub repo status has no accidental generated files.
- No `.env` or `.env.local` staged.
- No logs with secrets staged.

Python:

- `python -m py_compile` for changed Python files, or provider test suite.
- `pytest` if tests exist.
- Lint/type checks if configured.

Node/frontend:

- `npm install` or lockfile-respecting install if needed.
- `npm run lint` if available.
- `npm run typecheck` if available.
- `npm run build` if available and practical.

Docker:

- `docker compose config --quiet`.
- Fresh `docker compose up --build` through provider script or Hub run.
- Health/readiness check.
- `docker compose down --volumes --remove-orphans --rmi all` through delete path.

Hub backend:

- Provider registry tests.
- Provider lifecycle tests.
- Cleanup contract tests verifying delete scripts remove images.

## 14. Manual UI validation

For providers with UI:

- Open UI URL from Hub status.
- Verify first page loads without console/runtime errors.
- Execute the main user workflow through UI.
- Confirm UI calls the correct backend port.
- Confirm no CORS/proxy errors.
- Confirm frontend does not crash during provider install/run/delete.
- Confirm refreshing page keeps provider status accurate.

## 15. Logs to inspect

Inspect only non-secret logs.

Required log review:

- Hub task output.
- Provider wrapper stdout/stderr.
- Main API container logs.
- Agent/worker container logs.
- UI container logs if UI fails.
- Database/migration logs if data is required.

Look for:

- Tracebacks.
- `ERROR`, `FATAL`, `Unhandled`, `Exception`.
- Hidden fallback paths.
- Missing env/config messages.
- Port bind failures.
- Docker name/network conflicts.
- External API failures.
- Timeout or readiness loops.

Do not copy logs that include secrets into documentation, commits, issues, or PRs.

## 16. Conflict prevention checklist

Before adding a new provider to Hub, verify:

- Provider ID is unique.
- Deploy folder name is unique.
- Compose project name is unique.
- No fixed `container_name` conflicts with existing providers.
- No fixed Docker network conflicts.
- No fixed host port conflicts.
- No global process kill command.
- No global Docker prune command.
- No shared volume name unless intentionally shared and documented.
- No common local database/container name like plain `postgres`, `redis`, or `backend` with fixed container names.
- Provider can run after another provider has been installed/deleted.
- Provider delete does not remove another provider's containers/images/volumes.

## 17. Pass/fail definition

A provider is PASS only when all are true:

- Fresh Hub install succeeds.
- Fresh clone uses the expected provider repo commit.
- Run through Hub succeeds.
- Health/readiness succeeds.
- Main real workflow succeeds.
- No fallback/mock/static-only response.
- No hidden fatal errors in logs.
- Stop works if supported.
- Delete works.
- Delete removes provider-owned containers, volumes, networks, and source-built images.
- Reinstall after delete succeeds.
- Secrets are not printed or committed.
- Required source fixes are pushed to the provider repo.
- Required Hub wrapper fixes are committed in Hub repo.

A provider is FAIL or BLOCKED if any are true:

- It only passes health but not real workflow.
- It requires manual patching after Hub install.
- It leaves provider-owned images after delete.
- It kills Hub frontend/backend or unrelated provider containers.
- It silently falls back when real API/config fails.
- It needs a real external API key but does not receive it through Hub config/env.
- It has no repeatable test path for its core advertised feature.

## 18. Validation record template

Use this template per provider after testing.

```markdown
## Provider: <provider_id>

- Source repo:
- Branch:
- Expected commit:
- Fresh Hub clone commit:
- Install task ID:
- Run task ID:
- Delete task ID:
- Runtime ports:
- Health endpoint result:
- Real workflow tested:
- Real workflow result:
- Fallback detected: yes/no
- Key presence checked without printing value: yes/no/not required
- Containers cleaned: yes/no
- Volumes cleaned: yes/no
- Networks cleaned: yes/no
- Source-built images cleaned: yes/no
- Remaining acceptable base images:
- Logs reviewed:
- Provider source changes pushed: yes/no/not needed
- Hub wrapper changes committed: yes/no/not needed
- Final status: PASS/FAIL/BLOCKED
- Notes:
```

## 19. Common bad patterns to reject

Reject or fix these before Hub integration:

- Hardcoded host ports.
- Hardcoded absolute paths.
- Fixed `container_name` shared by multiple installs.
- Fixed Docker network names shared by multiple providers.
- Scripts that call `docker system prune`.
- Scripts that kill by broad process name like `node`, `python`, or `uvicorn`.
- Scripts that delete folders outside the provider deploy/runtime path.
- Cleanup without `--rmi all` for Compose-built images.
- Fallback responses counted as success.
- Static UI counted as functional validation.
- Raw `.env` printed for debugging.
- Provider works only from a manually modified deploy folder.
- Provider requires secrets but has no `.env.example` documentation.
- Source repo fix not pushed before Hub fresh install validation.

## 20. Recommended provider onboarding flow

1. Audit source repo files.
2. Audit `.env.example` and secret handling.
3. Audit Docker Compose for port/name/network conflicts.
4. Audit cleanup/delete behavior.
5. Run provider locally from clean clone.
6. Execute real workflow outside Hub.
7. Fix source repo if needed.
8. Commit and push provider source fixes.
9. Add/update Hub wrapper.
10. Run Hub backend registry/lifecycle tests.
11. Delete old deploy copy.
12. Install provider through Hub.
13. Verify clone commit.
14. Run provider through Hub.
15. Execute real workflow through Hub runtime.
16. Stop provider through Hub.
17. Delete provider through Hub.
18. Verify Docker/container/image/volume cleanup.
19. Reinstall once more after delete.
20. Record validation result using the template above.
