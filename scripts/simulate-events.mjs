/**
 * ─────────────────────────────────────────────────────────────────
 * DEV-ONLY: AI Workflow Event Simulator
 * ─────────────────────────────────────────────────────────────────
 * Streams realistic dummy workflow events to the local inject API.
 *
 * Usage:
 *   node scripts/simulate-events.mjs
 *   node scripts/simulate-events.mjs --once      # inject one batch and exit
 *   node scripts/simulate-events.mjs --speed 2   # 2× faster (default: 1)
 *
 * Remove this file (and the "simulate" script in package.json) before
 * any production deployment. It has no effect on real Kafka pipelines.
 * ─────────────────────────────────────────────────────────────────
 */

const API_BASE = process.env.API_URL ?? "http://localhost:4000/api";
const INJECT_URL = `${API_BASE}/events/inject`;
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

async function inject(event) {
    try {
        const res = await fetch(INJECT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
        });
        if (!res.ok) {
            console.error(`[simulator] inject failed: ${res.status} ${res.statusText}`);
        }
    } catch (err) {
        console.error(`[simulator] network error — is the API running? ${err.message}`);
    }
}

// ── Workflow Definitions ─────────────────────────────────────────
// Each scenario represents a real-world AI pipeline with sequential steps.
// step: { name, durationRange [ms], tokenRange, costPerKToken, failProb }

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

    console.log(`[simulator] ▶ Starting workflow: ${workflowId} (${scenario.name})`);

    let baseTime = new Date();

    for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const durationMs = randInt(...step.durationRange);
        const tokenUsage = randInt(...step.tokenRange);
        const cost = parseFloat(((tokenUsage / 1000) * step.costPerKToken).toFixed(6));
        const isFail = Math.random() < step.failProb;
        const isRetry = isFail && Math.random() < 0.6; // 60% of failures get retried

        const timestamp = new Date(baseTime).toISOString();

        // Emit 'running' for non-trivial steps
        if (durationMs > 600) {
            await inject({
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

        await inject({
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
            `[simulator]   ${finalStatus === "completed" ? "✓" : finalStatus === "retry" ? "↺" : "✗"} ` +
            `${workflowId} / ${step.name} → ${finalStatus} (${durationMs}ms, ${tokenUsage} tok, $${cost})`
        );

        if (finalStatus === "failed") {
            console.log(`[simulator] ✗ Workflow aborted at step "${step.name}": ${workflowId}`);
            return;
        }

        baseTime = new Date(baseTime.getTime() + durationMs + randInt(100, 400));

        // Small gap between steps
        await sleep(randInt(200, 600));
    }

    // Final human approval for some scenarios
    if (Math.random() < 0.3) {
        const approvalStatus = Math.random() < 0.85 ? "approved" : "rejected";
        await inject({
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
        console.log(`[simulator] ${approvalStatus === "approved" ? "✓" : "✗"} ${workflowId} → human-approval: ${approvalStatus}`);
    }

    console.log(`[simulator] ■ Completed workflow: ${workflowId}`);
}

// ── Main loop ────────────────────────────────────────────────────

async function main() {
    console.log(`
╔════════════════════════════════════════════════╗
║   AI Dashboard — Event Simulator (DEV ONLY)   ║
╚════════════════════════════════════════════════╝
  Target : ${INJECT_URL}
  Speed  : ${SPEED}×
  Mode   : ${ONCE ? "single batch" : "continuous loop"}
  Ctrl+C to stop
`);

    // Wait for API to be ready
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            const res = await fetch(`${API_BASE}/health`);
            if (res.ok) break;
        } catch {
            if (attempt === 9) {
                console.error("[simulator] API not reachable after 10 attempts. Is it running?");
                process.exit(1);
            }
            console.log(`[simulator] Waiting for API... (${attempt + 1}/10)`);
            await sleep(2000);
        }
    }

    const runBatch = async () => {
        // Run 2–4 workflows concurrently per batch
        const count = randInt(2, 4);
        const batch = Array.from({ length: count }, () => pick(SCENARIOS));

        // Stagger starts by 0–3s
        await Promise.all(
            batch.map((scenario, i) =>
                sleep(i * randInt(0, 3000)).then(() => runWorkflow(scenario))
            )
        );
    };

    if (ONCE) {
        await runBatch();
        return;
    }

    // Continuous mode: run a batch then wait before the next
    while (true) {
        await runBatch();
        const gap = randInt(8000, 20000);
        console.log(`[simulator] … next batch in ${(gap / 1000).toFixed(1)}s`);
        await sleep(gap);
    }
}

main().catch((err) => {
    console.error("[simulator] Fatal:", err);
    process.exit(1);
});
