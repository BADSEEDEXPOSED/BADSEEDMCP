// Netlify Scheduled Function: Brain Cycle
// Runs on a cron schedule to wake up the Brain

import { schedule } from '@netlify/functions';
import { BadSeedCortex } from '../../lib/cortex.js';

const handler = async (event) => {
    // 1. Initialize Cortex
    const cortex = new BadSeedCortex();

    try {
        // 2. Run Thought Cycle
        const thoughts = await cortex.think();

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: "Cycle Complete",
                thoughts: thoughts
            })
        };
    } catch (error) {
        console.error("🔥 Cortex Fracture (Error):", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Schedule: Run every 10 minutes (example)
// Cron: "*/10 * * * *" means "Every 10th minute"
export const config = {
    schedule: "*/10 * * * *"
};

export { handler };
