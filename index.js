import 'dotenv/config';

const VOICE_NODE_URL = "https://badseed.netlify.app/.netlify/functions";
const VALUE_NODE_URL = "https://badseed-token.netlify.app/.netlify/functions";

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
