import 'dotenv/config';

console.log("---------------------------------------------------");
console.log("🌱 BADSEED GOD NODE (BRAIN) STARTING UP...");
console.log("---------------------------------------------------");

if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  WARNING: OPENAI_API_KEY is not set in .env!");
} else {
    console.log("✅ API Key detected.");
}

async function main() {
    console.log("🧠 Brain is initializing...");
    console.log("waiting for instructions...");

    // TODO: Connect to badseed-exposed (Voice Node)
    // TODO: Connect to badseed-token (Value Node)
    // TODO: Loop forever (10 min schedule)
}

main().catch(console.error);
