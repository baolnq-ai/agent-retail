# Validation Benchmark1000

- Cập nhật: 31-05-2026
- Người thực hiện: Codex
- Phạm vi: cấu trúc test backend, generator, runner, docs và setup Docker dev infra.

## Kiểm Tra Đã Thực Hiện

| Hạng mục | Lệnh/Kiểm tra | Kết quả |
| --- | --- | --- |
| Cấu trúc thư mục | `rg --files --hidden tests` | Chỉ còn nhánh chuẩn `tests/backend tests/benchmark1000/` |
| Syntax generator | `node --check "tests/backend tests/benchmark1000/scripts/generate-benchmark-1000.mjs"` | Pass |
| Syntax runner | `node --check "tests/backend tests/benchmark1000/scripts/run-benchmark-1000.mjs"` | Pass |
| Sinh case | `BENCHMARK_SEED=20260531 node ...generate-benchmark-1000.mjs` | Tạo 1000 case tại `cases/retail-realistic-20260531.json` |
| Git hygiene | `.gitignore` | Case/report generated bị ignore; README/report/validation/script được giữ |
| Dev compose config | `docker compose -f infra/docker/docker-compose.yml config --quiet` | Pass |
| Root compose config | `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet` | Pass |
| Setup PowerShell | `$env:SETUP_TERMINAL_MODE='hidden'; .\setup.ps1` | Pass |
| Setup Bash syntax | `& 'C:\Program Files\Git\bin\bash.exe' -n setup.sh` | Pass |
| Setup Bash hidden alias | `SETUP_TERMINAL_MODE=hidden SETUP_RUN_MODE=source ./setup.sh` | Pass; log `logs/setup/setup-20260531-132633.log` ghi nhận normalize sang `background` |
| API typecheck | `corepack pnpm --filter @retail-agent/api typecheck` | Pass |
| Web typecheck | `corepack pnpm --filter @retail-agent/web typecheck` | Pass |
| Diff hygiene | `git diff --check` | Pass |
| Secret scan | `rg --pcre2 ... secret/tunnel patterns` | Không phát hiện secret hoặc URL tunnel thật trong working tree |
| Provider health | `GET http://127.0.0.1:3120/nginx-health` | HTTP 200 |
| API health | `GET http://127.0.0.1:3110/health` | HTTP 200 |
| Dashboard route | `GET http://127.0.0.1:3120/agent-dashboard` | HTTP 200 |

## Ghi Chú Setup

Lỗi Docker compose trước đó đến từ bind mount nginx template trong path Windows có dấu cách:

```text
error while creating mount source path '/run/desktop/mnt/host/c/code/my source/.../default.conf.template'
```

Đã đổi `infra/docker/docker-compose.yml` sang inline nginx config trong `command`, không còn bind mount `default.conf.template`. Cách này phù hợp cho Windows path có dấu cách và vẫn giữ nginx dev proxy qua `host.docker.internal`.

## Kết Quả Setup Sau Sửa

`setup.ps1` chạy thành công đến cuối:

- PostgreSQL: `127.0.0.1:3132`
- Redis: `127.0.0.1:3139`
- Qdrant: `127.0.0.1:3133`
- nginx provider: `127.0.0.1:3120`, container healthy
- API: `http://127.0.0.1:3110/health` trả HTTP 200
- nginx proxy: `http://127.0.0.1:3120/health` và `/` trả HTTP 200
