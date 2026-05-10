# Local Development Setup

> Full local environment: Kafka, MongoDB, Kafka UI, NestJS API, Next.js Web

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Your Mac (host)                                            │
│                                                             │
│  kafka-producer.mjs ──► localhost:9092 (EXTERNAL)          │
│  API on host        ──► localhost:9092 (EXTERNAL)          │
│                                                             │
│  ┌──────────────── kafka-setup/ Docker network ──────────┐ │
│  │                                                        │ │
│  │  zookeeper:2181                                        │ │
│  │       │                                                │ │
│  │  kafka-broker                                          │ │
│  │    ├── INTERNAL  kafka:29092  ◄── kafka-ui             │ │
│  │    ├── EXTERNAL  localhost:9092  (host access)         │ │
│  │    └── DOCKER    host.docker.internal:9093             │ │
│  │         ▲                                              │ │
│  │  kafka-ui:8080                                         │ │
│  │  mongodb:27017                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────── docker-compose.dev.yml network ───────────┐ │
│  │  api-dev:4000  ──► host.docker.internal:9093 (DOCKER) │ │
│  │  web-dev:3000                                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Why 3 Kafka listeners?

Kafka advertises its address in metadata responses. If `kafka-ui` connects to `kafka:9092` but the broker advertises `localhost:9092`, the UI gets redirected to `localhost` — which inside a Docker container is itself, not the broker. The fix is a dedicated `INTERNAL` listener that advertises `kafka:29092`, resolvable only within the same Docker network.

| Listener | Port | Advertised as | Used by |
|---|---|---|---|
| `INTERNAL` | 29092 | `kafka:29092` | `kafka-ui`, any service in kafka-setup network |
| `EXTERNAL` | 9092 | `localhost:9092` | Producer script, API running on host |
| `DOCKER` | 9093 | `host.docker.internal:9093` | `api-dev` container (docker-compose.dev.yml) |

---

## Prerequisites

- Docker Desktop (with `host.docker.internal` support, enabled by default on Mac)
- Node.js 18+
- pnpm (`npm i -g pnpm`)

---

## Step 1 — Start Infrastructure (Kafka + MongoDB + Kafka UI)

```bash
cd kafka-setup
docker compose up -d
```

Wait ~30 seconds for the broker healthcheck to pass, then verify:

```bash
docker compose ps
# All 4 should show "Up" or "healthy":
#   kafka-setup-zookeeper
#   kafka-setup-broker    (healthy)
#   kafka-setup-mongo
#   kafka-setup-ui
```

**Kafka UI:** http://localhost:8080  
→ Click **"local"** cluster → **Topics** to browse messages

---

## Step 2 — Install Dependencies

From the repo root:

```bash
pnpm install
```

---

## Step 3 — Start the App (hot-reload mode)

```bash
# From repo root
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| NestJS API | http://localhost:4000/api/health |
| Next.js Web | http://localhost:3000 |

The API container connects to Kafka via `host.docker.internal:9093` (DOCKER listener) and MongoDB via `host.docker.internal:27017`.

> First build takes ~2 minutes as NestJS compiles TypeScript. The healthcheck allows 120s.

---

## Step 4 — Send Mock Kafka Events

In a separate terminal from the **repo root**:

```bash
# Single transaction (test/smoke)
node scripts/kafka-producer.mjs --once

# Continuous — one transaction every 5 seconds (Ctrl+C to stop)
node scripts/kafka-producer.mjs
```

Or use the pnpm shortcuts:

```bash
pnpm simulate:kafka        # continuous
pnpm simulate:kafka:once   # single batch
```

The producer connects to `localhost:9092` and publishes all workflow steps for a randomly chosen scenario (Insurance Claim, Loan Origination, etc.) as a single Kafka batch. All steps share the same `transactionId`.

---

## Verifying Events

### Kafka UI
1. Open http://localhost:8080
2. Click **"local"** cluster
3. **Topics** → `ai-workflow-events` → **Messages** tab

### MongoDB
```bash
mongosh "mongodb://localhost:27017/ai_workflows"
```
```js
db.workflow_events.countDocuments()
db.workflow_events.find().sort({ timestamp: -1 }).limit(5).pretty()
db.workflow_events.distinct("transactionId")
db.workflow_events.distinct("workflowId")
```

### API REST
```bash
curl http://localhost:4000/api/workflows?usecase=Test+UseCase | jq
curl http://localhost:4000/api/transactions?usecase=Test+UseCase | jq
curl http://localhost:4000/api/stats?usecase=Test+UseCase | jq
```

---

## Teardown

```bash
# Stop app containers
docker compose -f docker-compose.dev.yml down

# Stop infrastructure (keeps MongoDB data)
cd kafka-setup && docker compose down

# Full wipe — deletes all MongoDB data
cd kafka-setup && docker compose down -v
```

---

## Troubleshooting

### Kafka UI shows "offline" or no topics

The broker took too long to start. Wait for the healthcheck:
```bash
docker compose ps    # kafka-setup-broker should say (healthy)
```
If still failing, restart just the UI:
```bash
docker compose restart kafka-ui
```

### Producer: `ECONNREFUSED localhost:9092`

Kafka is not running. Start it:
```bash
cd kafka-setup && docker compose up -d
```

### API can't connect to Kafka

The API uses `host.docker.internal:9093`. Verify the DOCKER listener is up:
```bash
docker exec kafka-setup-broker kafka-topics --bootstrap-server localhost:9092 --list
```

### `TimeoutNegativeWarning` in producer output

Harmless — it's a KafkaJS quirk with the Node.js version. Events are published successfully.

### NestJS API healthcheck fails (web-dev won't start)

NestJS takes ~90s to compile on first start. The healthcheck has a 120s `start_period`. If it still fails, check the API logs:
```bash
docker compose -f docker-compose.dev.yml logs api-dev --tail 50
```

---

## Port Reference

| Port | Service |
|---|---|
| 2181 | ZooKeeper |
| 9092 | Kafka — host access (EXTERNAL listener) |
| 9093 | Kafka — Docker container access (DOCKER listener) |
| 8080 | Kafka UI |
| 27017 | MongoDB |
| 4000 | NestJS API |
| 3000 | Next.js Web |
