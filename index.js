import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

const BACKUP_PATH = path.join(process.cwd(), 'memory', 'backup_seed.json');

const VOICE_NODE_URL = "https://badseed.netlify.app/.netlify/functions";
const VALUE_NODE_URL = "https://badseedtoken.netlify.app/.netlify/functions";

/**
 * GARDEN CARE: Check the health of all roots and perform a "Pulse Poke" if withered.
 */
async function checkRootVitality() {
    console.log("🌱 Garden Care: Inspecting Root Vitality...");
    const nodes = [
        { name: "ROOT (VOICE)", url: `${VOICE_NODE_URL}/heartbeat-get`, awakeUrl: `${VOICE_NODE_URL}/cloud-queue-poller` },
        { name: "STALK (VALUE)", url: `${VALUE_NODE_URL}/summary`, awakeUrl: `${VALUE_NODE_URL}/summary` }
    ];

    for (const node of nodes) {
        try {
            const start = Date.now();
            const res = await fetch(node.url, { method: 'HEAD' });
            const latency = Date.now() - start;
            if (res.ok) {
                console.log(`   ✅ ${node.name}: Online (${latency}ms)`);
            } else {
                console.warn(`   ⚠️ ${node.name}: Tensed (${res.status}). Initiating Pulse Poke...`);
                await fetch(node.awakeUrl); // The Awakening
            }
        } catch (e) {
            console.error(`   ❌ ${node.name}: Nerve Block Detected! (${e.message}). Sending Emergency Pulse...`);
            try { await fetch(node.awakeUrl); } catch (err) { /* silent fail */ }
        }
    }
}

/**
 * GENETIC MEMORY: Restore the cloud from local DNA if it has amnesia.
 */
async function healAmnesia() {
    console.log("🧬 Genetic Memory: Checking for Cloud Amnesia...");
    try {
        const res = await fetch(`${VOICE_NODE_URL}/config-get`);
        const data = await res.json();
        const rules = data.rules || [];

        if (rules.length === 0) {
            console.warn("   ⚠️ Amnesia Detected: Voice Node has no rules. Re-planting from Local Seed...");
            const localSeed = await fs.readFile(BACKUP_PATH, 'utf-8');
            const seedData = JSON.parse(localSeed);

            await fetch(`${VOICE_NODE_URL}/config-set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: seedData.rules })
            });
            console.log("   ✅ Restoration Complete: Roots are remembered.");
        } else {
            // Update local backup with the latest cloud state
            console.log("   🌱 Cloud is healthy. Updating Local Backup Seed...");
            await fs.writeFile(BACKUP_PATH, JSON.stringify({ rules, timestamp: new Date().toISOString() }, null, 2));
        }
    } catch (e) {
        console.error("   ❌ Genetic Sync Failed:", e.message);
    }
}

console.log("---------------------------------------------------");
console.log("🌱 BADSEED GOD NODE (BRAIN) STARTING UP...");
console.log("---------------------------------------------------");

if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  WARNING: OPENAI_API_KEY is not set in .env!");
} else {
    console.log("✅ API Key detected.");
}

async function orchestrate() {
    console.log(`[${new Date().toISOString()}] 🧠 Brain is processing...`);

    // Step 0: Garden Care & Genetic Healing
    await checkRootVitality();
    await healAmnesia();

    try {
        // 1. Fetch Value Node Data
        console.log("🔍 Fetching Value Metrics...");
        const summaryRes = await fetch(`${VALUE_NODE_URL}/summary`);
        if (!summaryRes.ok) throw new Error("Value Node summary unavailable");
        const summary = await summaryRes.json();

        // 2. Fetch Sentiment Data
        console.log("🔍 Fetching Collective Sentiment...");
        const sentimentRes = await fetch(`${VOICE_NODE_URL}/sentiment-get`);
        if (!sentimentRes.ok) throw new Error("Voice Node sentiment unavailable");
        const sentimentData = await sentimentRes.json();
        const sentiments = sentimentData.sentiments || { hope: 0, greed: 0, fear: 0, mystery: 0 };

        // 3. Determine Persona Override
        let activePersona = null;
        if (sentiments.greed > sentiments.hope && sentiments.greed > 50) {
            activePersona = "BLOCKCHAIN_PARASITE";
        } else if (sentiments.fear > sentiments.hope && sentiments.fear > 50) {
            activePersona = "CORRUPTED_GARDEN";
        } else if (sentiments.hope > 50) {
            activePersona = "ANCIENT_SEED";
        }

        console.log(`🧠 Orchestration Decision: Persona=${activePersona || 'AUTO'}`);

        // 4. Sync to Voice Node Config
        console.log("📤 Syncing Data to Voice Node...");
        const configRes = await fetch(`${VOICE_NODE_URL}/dapp-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemMetadata: {
                    price_sol: summary.price_sol,
                    market_cap_sol: summary.market_cap_sol,
                    curve_progress: summary.curve_progress,
                    total_donated_sol: summary.total_donated_sol
                },
                activePersona: activePersona
            })
        });

        if (configRes.ok) {
            console.log("✅ Sync Complete.");
        } else {
            console.error("❌ Sync Failed:", await configRes.text());
        }

    } catch (error) {
        console.error("❌ Orchestration Error:", error.message);
    }
}

async function main() {
    console.log("🧠 Brain is initializing...");

    // Run immediately on start
    await orchestrate();

    // Run every 10 minutes
    setInterval(orchestrate, 10 * 60 * 1000);
}

main().catch(console.error);
