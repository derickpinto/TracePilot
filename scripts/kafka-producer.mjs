/**
 * ─────────────────────────────────────────────────────────────────
 * DEV-ONLY: AI Workflow Kafka Event Producer
 * ─────────────────────────────────────────────────────────────────
 * Every 5 seconds, generates a fresh transactionId + workflowId,
 * then publishes all steps of a randomly chosen workflow scenario
 * to Kafka. All events in one batch share the same transactionId.
 *
 * Prerequisites:
 *   cd kafka-setup && docker compose up -d    # starts Kafka + MongoDB
 *   pnpm install                              # installs kafkajs
 *
 * Usage:
 *   node scripts/kafka-producer.mjs
 *   node scripts/kafka-producer.mjs --once   # single transaction then exit
 *
 * Connects to local Kafka at localhost:9092
 * (Confluent CP from kafka-setup/docker-compose.yml)
 * ─────────────────────────────────────────────────────────────────
 *
 * Verify in MongoDB:
 *   mongosh "mongodb://localhost:27017/ai_workflows"
 *   > db.workflow_events.countDocuments()
 *   > db.workflow_events.find().sort({ timestamp: -1 }).limit(5).pretty()
 *   > db.workflow_events.distinct("transactionId")
 * ─────────────────────────────────────────────────────────────────
 */

import { Kafka, Partitioners } from "kafkajs";

const BROKER  = process.env.KAFKA_BROKER ?? "localhost:9092";
const TOPIC   = process.env.KAFKA_TOPIC  ?? "ai-workflow-events";
const USECASE = "Test UseCase";
const INTERVAL_MS = 5000; // send one full transaction every 5 seconds

const ONCE = process.argv.includes("--once");

// ── Helpers ──────────────────────────────────────────────────────

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick    = (arr) => arr[randInt(0, arr.length - 1)];
const uid     = () => Math.random().toString(36).slice(2, 10);

// ── Kafka client ─────────────────────────────────────────────────

const kafka = new Kafka({
    clientId: "ai-dashboard-producer",
    brokers: [BROKER],
    retry: { retries: 5, initialRetryTime: 500 },
    logLevel: 1, // WARN only — suppress INFO noise
});

const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
});

async function publish(event) {
    await producer.send({
        topic: TOPIC,
        messages: [{
            key: event.transactionId,
            value: JSON.stringify(event),
        }],
    });
}

// ── Workflow Scenarios ───────────────────────────────────────────

const SCENARIOS = [
    {
        name: "Insurance Claim Processing",
        workflowPrefix: "claim",
        steps: [
            { name: "document-ingestion",    durationRange: [400,  900],  tokenRange: [800,  1500],  costPerKToken: 0.01, failProb: 0.02 },
            { name: "ocr-extraction",        durationRange: [900,  2200], tokenRange: [1200, 2800],  costPerKToken: 0.02, failProb: 0.03 },
            { name: "policy-lookup",         durationRange: [200,  600],  tokenRange: [300,  700],   costPerKToken: 0.01, failProb: 0.01 },
            { name: "fraud-detection",       durationRange: [1500, 4000], tokenRange: [3000, 8000],  costPerKToken: 0.03, failProb: 0.08 },
            { name: "coverage-assessment",   durationRange: [800,  2000], tokenRange: [2000, 5000],  costPerKToken: 0.03, failProb: 0.04 },
            { name: "reserve-calculation",   durationRange: [300,  800],  tokenRange: [500,  1200],  costPerKToken: 0.02, failProb: 0.01 },
            { name: "adjuster-summary",      durationRange: [1000, 2500], tokenRange: [1500, 3500],  costPerKToken: 0.03, failProb: 0.02 },
        ],
    },
    {
        name: "Loan Origination",
        workflowPrefix: "loan",
        steps: [
            { name: "application-parsing",   durationRange: [300,  700],  tokenRange: [600,  1400],  costPerKToken: 0.01, failProb: 0.02 },
            { name: "identity-verification", durationRange: [800,  1800], tokenRange: [400,  900],   costPerKToken: 0.02, failProb: 0.05 },
            { name: "credit-bureau-pull",    durationRange: [1200, 3000], tokenRange: [200,  500],   costPerKToken: 0.01, failProb: 0.03 },
            { name: "income-analysis",       durationRange: [1000, 2500], tokenRange: [3500, 9000],  costPerKToken: 0.03, failProb: 0.04 },
            { name: "risk-scoring",          durationRange: [1500, 3500], tokenRange: [4000, 10000], costPerKToken: 0.04, failProb: 0.06 },
            { name: "underwriting-decision", durationRange: [2000, 5000], tokenRange: [2000, 5000],  costPerKToken: 0.05, failProb: 0.04 },
            { name: "offer-generation",      durationRange: [600,  1400], tokenRange: [1000, 2500],  costPerKToken: 0.03, failProb: 0.01 },
        ],
    },
    {
        name: "Customer Support Triage",
        workflowPrefix: "support",
        steps: [
            { name: "ticket-classification", durationRange: [200,  600],  tokenRange: [500,  1200],  costPerKToken: 0.01, failProb: 0.01 },
            { name: "sentiment-analysis",    durationRange: [300,  800],  tokenRange: [800,  2000],  costPerKToken: 0.02, failProb: 0.01 },
            { name: "kb-retrieval",          durationRange: [400,  1000], tokenRange: [2000, 6000],  costPerKToken: 0.01, failProb: 0.03 },
            { name: "response-generation",   durationRange: [1200, 3000], tokenRange: [3000, 8000],  costPerKToken: 0.04, failProb: 0.02 },
            { name: "quality-check",         durationRange: [500,  1200], tokenRange: [1000, 2500],  costPerKToken: 0.03, failProb: 0.03 },
            { name: "escalation-decision",   durationRange: [300,  700],  tokenRange: [400,  900],   costPerKToken: 0.02, failProb: 0.02 },
        ],
    },
    {
        name: "Medical Record Summarization",
        workflowPrefix: "medrecord",
        steps: [
            { name: "record-ingestion",      durationRange: [500,  1200], tokenRange: [1000, 3000],  costPerKToken: 0.01, failProb: 0.02 },
            { name: "phi-detection",         durationRange: [800,  2000], tokenRange: [1500, 4000],  costPerKToken: 0.02, failProb: 0.02 },
            { name: "icd-code-extraction",   durationRange: [1200, 3000], tokenRange: [4000, 12000], costPerKToken: 0.04, failProb: 0.05 },
            { name: "medication-parsing",    durationRange: [700,  1800], tokenRange: [2000, 6000],  costPerKToken: 0.03, failProb: 0.03 },
            { name: "clinical-summary",      durationRange: [2000, 5000], tokenRange: [5000, 15000], costPerKToken: 0.05, failProb: 0.03 },
        ],
    },
    {
        name: "Contract Intelligence",
        workflowPrefix: "contract",
        steps: [
            { name: "document-parsing",      durationRange: [600,  1500], tokenRange: [2000, 5000],  costPerKToken: 0.02, failProb: 0.02 },
            { name: "clause-extraction",     durationRange: [1500, 4000], tokenRange: [6000, 18000], costPerKToken: 0.04, failProb: 0.04 },
            { name: "risk-flag-detection",   durationRange: [1000, 2500], tokenRange: [4000, 10000], costPerKToken: 0.04, failProb: 0.06 },
            { name: "obligation-mapping",    durationRange: [800,  2000], tokenRange: [3000, 8000],  costPerKToken: 0.03, failProb: 0.03 },
            { name: "executive-summary",     durationRange: [2000, 5000], tokenRange: [2000, 5000],  costPerKToken: 0.05, failProb: 0.02 },
        ],
    },
];

const MODELS  = ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "claude-3-haiku", "gemini-1.5-pro"];
const REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1"];

// ── Build and send one complete transaction ───────────────────────
// All events share the same transactionId. Steps use simulated
// timestamps (not real-time delays) so the batch publishes instantly.

async function sendTransaction() {
    const scenario     = pick(SCENARIOS);
    const workflowId   = `${scenario.workflowPrefix}-${uid()}`;
    const transactionId = `txn-${uid()}`;
    const model        = pick(MODELS);
    const region       = pick(REGIONS);

    console.log(`\n[producer] ▶ ${workflowId}  txn=${transactionId}  (${scenario.name})`);

    let events = [];
    let cursor = new Date();

    for (let i = 0; i < scenario.steps.length; i++) {
        const step       = scenario.steps[i];
        const durationMs = randInt(...step.durationRange);
        const tokenUsage = randInt(...step.tokenRange);
        const cost       = parseFloat(((tokenUsage / 1000) * step.costPerKToken).toFixed(6));
        const failed     = Math.random() < step.failProb;
        const retried    = failed && Math.random() < 0.6;
        const status     = failed ? (retried ? "retry" : "failed") : "completed";

        // running event for non-trivial steps
        if (durationMs > 600) {
            events.push({
                workflowId, transactionId, usecase: USECASE,
                step: step.name, status: "running",
                timestamp: new Date(cursor).toISOString(),
                durationMs: 0, tokenUsage: 0, cost: 0,
                metadata: { model, region, stepIndex: i },
            });
        }

        events.push({
            workflowId, transactionId, usecase: USECASE,
            step: step.name, status,
            timestamp: new Date(cursor.getTime() + durationMs).toISOString(),
            durationMs, tokenUsage, cost,
            metadata: {
                model, region, stepIndex: i,
                ...(failed ? { errorCode: pick(["TIMEOUT", "RATE_LIMIT", "CONTEXT_OVERFLOW", "PARSE_ERROR"]) } : {}),
            },
        });

        const icon = status === "completed" ? "✓" : status === "retry" ? "↺" : "✗";
        console.log(`[producer]   ${icon} ${step.name} → ${status}  (${durationMs}ms, ${tokenUsage} tok, $${cost})`);

        if (status === "failed") {
            console.log(`[producer] ✗ Aborted at step "${step.name}"`);
            break;
        }

        cursor = new Date(cursor.getTime() + durationMs + randInt(100, 400));
    }

    // Publish all events in one Kafka batch
    await producer.send({
        topic: TOPIC,
        messages: events.map((e) => ({ key: e.transactionId, value: JSON.stringify(e) })),
    });

    console.log(`[producer] ■ Sent ${events.length} events for ${transactionId}`);
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    console.log(`
╔═════════════════════════════════════════════════════╗
║   AI Dashboard — Kafka Event Producer (DEV ONLY)   ║
╚═════════════════════════════════════════════════════╝
  Broker   : ${BROKER}
  Topic    : ${TOPIC}
  Interval : ${INTERVAL_MS / 1000}s per transaction
  Mode     : ${ONCE ? "single transaction" : "continuous (Ctrl+C to stop)"}

  Verify in MongoDB:
    mongosh "mongodb://localhost:27017/ai_workflows"
    > db.workflow_events.countDocuments()
    > db.workflow_events.find().sort({timestamp:-1}).limit(5).pretty()
`);

    console.log("[producer] Connecting to Kafka...");
    await producer.connect();
    console.log("[producer] Connected.\n");

    if (ONCE) {
        await sendTransaction();
    } else {
        // Send immediately, then every 5 seconds
        await sendTransaction();
        const timer = setInterval(async () => {
            try {
                await sendTransaction();
            } catch (err) {
                console.error("[producer] Error sending transaction:", err.message);
            }
        }, INTERVAL_MS);

        // Graceful shutdown on Ctrl+C
        process.on("SIGINT", async () => {
            clearInterval(timer);
            console.log("\n[producer] Shutting down...");
            await producer.disconnect();
            console.log("[producer] Disconnected. Bye.");
            process.exit(0);
        });
    }

    if (ONCE) {
        await producer.disconnect();
        console.log("[producer] Done.");
    }
}

main().catch((err) => {
    console.error("[producer] Fatal:", err.message);
    producer.disconnect().finally(() => process.exit(1));
});


const BROKER = process.env.KAFKA_BROKER ?? "localhost:9094";
const TOPIC = process.env.KAFKA_TOPIC ?? "ai-workflow-events";
const USECASE = "Test UseCase";

const args = process.argv.slice(2);
const ONCE = args.includes("--once");
const speedIdx = args.indexOf("--speed");
const SPEED = speedIdx !== -1 ? parseFloat(args[speedIdx + 1]) || 1 : 1;

// ── Helpers ──────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Kafka setup ──────────────────────────────────────────────────

const kafka = new Kafka({
    clientId: "ai-dashboard-producer",
    brokers: [BROKER],
    retry: { retries: 5, initialRetryTime: 500 },
});

const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
});

async function publish(event) {
    await producer.send({
        topic: TOPIC,
        messages: [
            {
                key: event.transactionId,
                value: JSON.stringify(event),
            },
        ],
    });
}

// ── Workflow Definitions ─────────────────────────────────────────

const SCENARIOS = [
    {
        name: "Insurance Claim Processing",
        workflowPrefix: "claim",
        steps: [
            { name: "document-ingestion", durationRange: [400, 900], tokenRange: [800, 1500], costPerKToken: 0.01, failProb: 0.02 },
            { name: "ocr-extraction", durationRange: [900, 2200], tokenRange: [1200, 2800], costPerKToken: 0.02, failProb: 0.03 },
            { name: "policy-lookup", durationRange: [200, 600], tokenRange: [300, 700], costPerKToken: 0.01, failProb: 0.01 },
            { name: "fraud-detection", durationRange: [1500, 4000], tokenRange: [3000, 8000], costPerKToken: 0.03, failProb: 0.08 },
            { name: "coverage-assessment", durationRange: [800, 2000], tokenRange: [2000, 5000], costPerKToken: 0.03, failProb: 0.04 },
            { name: "reserve-calculation", durationRange: [300, 800], tokenRange: [500, 1200], costPerKToken: 0.02, failProb: 0.01 },
            { name: "adjuster-summary", durationRange: [1000, 2500], tokenRange: [1500, 3500], costPerKToken: 0.03, failProb: 0.02 },
            { name: "human-review-required", durationRange: [500, 1000], tokenRange: [200, 500], costPerKToken: 0.01, failProb: 0.00 },
        ],
    },
    {
        name: "Loan Origination",
        workflowPrefix: "loan",
        steps: [
            { name: "application-parsing", durationRange: [300, 700], tokenRange: [600, 1400], costPerKToken: 0.01, failProb: 0.02 },
            { name: "identity-verification", durationRange: [800, 1800], tokenRange: [400, 900], costPerKToken: 0.02, failProb: 0.05 },
            { name: "credit-bureau-pull", durationRange: [1200, 3000], tokenRange: [200, 500], costPerKToken: 0.01, failProb: 0.03 },
            { name: "income-analysis", durationRange: [1000, 2500], tokenRange: [3500, 9000], costPerKToken: 0.03, failProb: 0.04 },
            { name: "dti-ratio-calc", durationRange: [200, 500], tokenRange: [300, 700], costPerKToken: 0.01, failProb: 0.00 },
            { name: "risk-scoring", durationRange: [1500, 3500], tokenRange: [4000, 10000], costPerKToken: 0.04, failProb: 0.06 },
            { name: "underwriting-decision", durationRange: [2000, 5000], tokenRange: [2000, 5000], costPerKToken: 0.05, failProb: 0.04 },
            { name: "offer-generation", durationRange: [600, 1400], tokenRange: [1000, 2500], costPerKToken: 0.03, failProb: 0.01 },
        ],
    },
    {
        name: "Customer Support Triage",
        workflowPrefix: "support",
        steps: [
            { name: "ticket-classification", durationRange: [200, 600], tokenRange: [500, 1200], costPerKToken: 0.01, failProb: 0.01 },
            { name: "sentiment-analysis", durationRange: [300, 800], tokenRange: [800, 2000], costPerKToken: 0.02, failProb: 0.01 },
            { name: "kb-retrieval", durationRange: [400, 1000], tokenRange: [2000, 6000], costPerKToken: 0.01, failProb: 0.03 },
            { name: "response-generation", durationRange: [1200, 3000], tokenRange: [3000, 8000], costPerKToken: 0.04, failProb: 0.02 },
            { name: "quality-check", durationRange: [500, 1200], tokenRange: [1000, 2500], costPerKToken: 0.03, failProb: 0.03 },
            { name: "escalation-decision", durationRange: [300, 700], tokenRange: [400, 900], costPerKToken: 0.02, failProb: 0.02 },
        ],
    },
    {
        name: "Medical Record Summarization",
        workflowPrefix: "medrecord",
        steps: [
            { name: "record-ingestion", durationRange: [500, 1200], tokenRange: [1000, 3000], costPerKToken: 0.01, failProb: 0.02 },
            { name: "phi-detection", durationRange: [800, 2000], tokenRange: [1500, 4000], costPerKToken: 0.02, failProb: 0.02 },
            { name: "icd-code-extraction", durationRange: [1200, 3000], tokenRange: [4000, 12000], costPerKToken: 0.04, failProb: 0.05 },
            { name: "medication-parsing", durationRange: [700, 1800], tokenRange: [2000, 6000], costPerKToken: 0.03, failProb: 0.03 },
            { name: "clinical-summary", durationRange: [2000, 5000], tokenRange: [5000, 15000], costPerKToken: 0.05, failProb: 0.03 },
            { name: "physician-review-flag", durationRange: [300, 700], tokenRange: [200, 500], costPerKToken: 0.01, failProb: 0.01 },
        ],
    },
    {
        name: "Contract Intelligence",
        workflowPrefix: "contract",
        steps: [
            { name: "document-parsing", durationRange: [600, 1500], tokenRange: [2000, 5000], costPerKToken: 0.02, failProb: 0.02 },
            { name: "clause-extraction", durationRange: [1500, 4000], tokenRange: [6000, 18000], costPerKToken: 0.04, failProb: 0.04 },
            { name: "risk-flag-detection", durationRange: [1000, 2500], tokenRange: [4000, 10000], costPerKToken: 0.04, failProb: 0.06 },
            { name: "obligation-mapping", durationRange: [800, 2000], tokenRange: [3000, 8000], costPerKToken: 0.03, failProb: 0.03 },
            { name: "benchmark-comparison", durationRange: [1200, 3000], tokenRange: [5000, 14000], costPerKToken: 0.05, failProb: 0.04 },
            { name: "executive-summary", durationRange: [2000, 5000], tokenRange: [2000, 5000], costPerKToken: 0.05, failProb: 0.02 },
            { name: "legal-approval-request", durationRange: [400, 900], tokenRange: [300, 700], costPerKToken: 0.01, failProb: 0.00 },
        ],
    },
];

const MODELS = ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "claude-3-haiku", "gemini-1.5-pro"];
const REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1"];

// ── Single workflow runner ───────────────────────────────────────

async function runWorkflow(scenario) {
    const workflowId = `${scenario.workflowPrefix}-${uid()}`;
    const transactionId = `txn-${uid()}`;
    const model = pick(MODELS);
    const region = pick(REGIONS);

    console.log(`[kafka-producer] ▶ Starting workflow: ${workflowId} (${scenario.name})`);

    let baseTime = new Date();

    for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const durationMs = randInt(...step.durationRange);
        const tokenUsage = randInt(...step.tokenRange);
        const cost = parseFloat(((tokenUsage / 1000) * step.costPerKToken).toFixed(6));
        const isFail = Math.random() < step.failProb;
        const isRetry = isFail && Math.random() < 0.6;

        const timestamp = new Date(baseTime).toISOString();

        // Emit 'running' for non-trivial steps
        if (durationMs > 600) {
            await publish({
                workflowId,
                transactionId,
                usecase: USECASE,
                step: step.name,
                status: "running",
                timestamp,
                durationMs: 0,
                tokenUsage: 0,
                cost: 0,
                metadata: { model, region, stepIndex: i },
            });
            await sleep(durationMs * 0.4);
        }

        const finalStatus = isFail ? (isRetry ? "retry" : "failed") : "completed";

        await publish({
            workflowId,
            transactionId,
            usecase: USECASE,
            step: step.name,
            status: finalStatus,
            timestamp: new Date(baseTime.getTime() + durationMs).toISOString(),
            durationMs,
            tokenUsage,
            cost,
            metadata: {
                model,
                region,
                stepIndex: i,
                ...(isFail ? { errorCode: pick(["TIMEOUT", "RATE_LIMIT", "CONTEXT_OVERFLOW", "PARSE_ERROR"]) } : {}),
            },
        });

        console.log(
            `[kafka-producer]   ${finalStatus === "completed" ? "✓" : finalStatus === "retry" ? "↺" : "✗"} ` +
            `${workflowId} / ${step.name} → ${finalStatus} (${durationMs}ms, ${tokenUsage} tok, $${cost})`
        );

        if (finalStatus === "failed") {
            console.log(`[kafka-producer] ✗ Workflow aborted at step "${step.name}": ${workflowId}`);
            return;
        }

        baseTime = new Date(baseTime.getTime() + durationMs + randInt(100, 400));
        await sleep(randInt(200, 600));
    }

    // Final human approval for some scenarios
    if (Math.random() < 0.3) {
        const approvalStatus = Math.random() < 0.85 ? "approved" : "rejected";
        await publish({
            workflowId,
            transactionId,
            usecase: USECASE,
            step: "human-approval",
            status: approvalStatus,
            timestamp: new Date(baseTime).toISOString(),
            durationMs: randInt(5000, 120000),
            tokenUsage: 0,
            cost: 0,
            metadata: { model, region, reviewer: `agent-${randInt(1, 8)}` },
        });
        console.log(`[kafka-producer] ${approvalStatus === "approved" ? "✓" : "✗"} ${workflowId} → human-approval: ${approvalStatus}`);
    }

    console.log(`[kafka-producer] ■ Completed workflow: ${workflowId}`);
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    console.log(`
╔════════════════════════════════════════════════════╗
║  AI Dashboard — Kafka Event Producer (DEV ONLY)   ║
╚════════════════════════════════════════════════════╝
  Broker : ${BROKER}
  Topic  : ${TOPIC}
  Speed  : ${SPEED}×
  Mode   : ${ONCE ? "single batch" : "continuous loop"}
  Ctrl+C to stop
`);

    console.log("[kafka-producer] Connecting to Kafka...");
    await producer.connect();
    console.log("[kafka-producer] Connected. Publishing events...\n");

    const runBatch = async () => {
        const count = randInt(2, 4);
        const batch = Array.from({ length: count }, () => pick(SCENARIOS));
        await Promise.all(
            batch.map((scenario, i) =>
                sleep(i * randInt(0, 3000)).then(() => runWorkflow(scenario))
            )
        );
    };

    if (ONCE) {
        await runBatch();
    } else {
        while (true) {
            await runBatch();
            const gap = randInt(3000, 8000);
            console.log(`\n[kafka-producer] Batch done. Next batch in ${(gap / 1000).toFixed(1)}s...\n`);
            await sleep(gap);
        }
    }

    await producer.disconnect();
    console.log("[kafka-producer] Disconnected. Done.");
}

main().catch((err) => {
    console.error("[kafka-producer] Fatal error:", err.message);
    producer.disconnect().finally(() => process.exit(1));
});
