const VOICE_NODE_URL = "https://badseed.netlify.app/.netlify/functions";
const VALUE_NODE_URL = "https://badseed-token.netlify.app/.netlify/functions";

class BadSeedCortex {
    constructor() {
        this.memory = {}; // Short-term memory for this cycle
    }

    /**
     * The Main Loop: Check -> Decide -> Act
     */
    async think() {
        console.log("🧠 Cortex: Beginning Thought Cycle...");

        // Step 1: Perception (Gather Data from Nodes)
        const perception = await this.gatherData();

        // Step 2: Cognition (Decide what to do)
        const decision = await this.decide(perception);

        // Step 3: Action (Execute via Nodes)
        const result = await this.act(decision);

        console.log("🧠 Cortex: Cycle Complete.");
        return {
            perception,
            decision,
            result
        };
    }

    async gatherData() {
        console.log("   👀 Perceiving: Fetching Node Metrics...");
        try {
            const [summaryRes, sentimentRes] = await Promise.all([
                fetch(`${VALUE_NODE_URL}/summary`),
                fetch(`${VOICE_NODE_URL}/sentiment-get`)
            ]);

            if (!summaryRes.ok || !sentimentRes.ok) {
                throw new Error("One or more nodes unavailable");
            }

            const summary = await summaryRes.json();
            const sentimentData = await sentimentRes.json();

            return {
                value: summary,
                voice: sentimentData.sentiments || { hope: 0, greed: 0, fear: 0, mystery: 0 }
            };
        } catch (error) {
            console.error("   ❌ Perception Failed:", error.message);
            return null;
        }
    }

    async decide(perception) {
        if (!perception) return { action: "WAIT", reason: "Perception failed" };

        console.log("   🤔 Thinking: Analyzing Collective Sentiment...");
        const sentiments = perception.voice;

        // Determine Persona Override
        let activePersona = null;
        if (sentiments.greed > sentiments.hope && sentiments.greed > 50) {
            activePersona = "BLOCKCHAIN_PARASITE";
        } else if (sentiments.fear > sentiments.hope && sentiments.fear > 50) {
            activePersona = "CORRUPTED_GARDEN";
        } else if (sentiments.hope > 50) {
            activePersona = "ANCIENT_SEED";
        }

        return {
            action: "SYNC",
            persona: activePersona,
            metadata: {
                price_sol: perception.value.price_sol,
                market_cap_sol: perception.value.market_cap_sol,
                curve_progress: perception.value.curve_progress,
                total_donated_sol: perception.value.total_donated_sol
            }
        };
    }

    async act(decision) {
        if (decision.action === "WAIT") return false;

        console.log(`   ⚡ Acting: Syncing Data to Voice Node (Persona=${decision.persona || 'AUTO'})`);
        try {
            const configRes = await fetch(`${VOICE_NODE_URL}/dapp-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemMetadata: decision.metadata,
                    activePersona: decision.persona
                })
            });

            if (configRes.ok) {
                console.log("   ✅ Sync Complete.");
                return true;
            } else {
                console.error("   ❌ Sync Failed:", await configRes.text());
                return false;
            }
        } catch (error) {
            console.error("   ❌ Action Failed:", error.message);
            return false;
        }
    }
}

export { BadSeedCortex };
