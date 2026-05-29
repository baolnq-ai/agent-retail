# App Screenshots

## Run Report

Target: `http://127.0.0.1:7000/agent-dashboard`

Result: pass. Mỗi ảnh nền có 7 cluster, route lines, particle canvas đang chạy, step number nằm trong node/agent, không còn floating step badge riêng, không horizontal overflow, không clipped node, không node overlap và không hidden step text.

## Screenshots

- `01-cluster-recommendation-desktop.png`: flow recommendation có Session context, Task workspace, History, Tools, DB/state, Agents và Response clusters.
- `02-cluster-cart-desktop.png`: flow cart có Cart, Postgres/state, Lead return, Sales draft và final response path.
- `03-cluster-dense-mobile.png`: flow dense trên mobile 390px, vẫn giữ cùng cluster và không node overlap.
- `04-session-context-detail.png`: bằng chứng click Session context; popup có trace id, timestamp, history turns, preferences, context docs và session edges.
- `05-task-workspace-detail.png`: bằng chứng click Task workspace; popup có intent, refs, agents, writes, returns và errors.
- `06-history-cluster-detail.png`: bằng chứng click History cluster trên mobile; popup có history turns, summary length, preferences, resolved refs và summarized history flow.
