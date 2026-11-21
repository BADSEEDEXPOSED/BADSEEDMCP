import { BadSeedCortex } from './lib/cortex.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/.netlify/functions/brain-cycle' || url.pathname === '/brain-cycle') {
      const cortex = new BadSeedCortex();
      try {
        const thoughts = await cortex.think();
        return new Response(JSON.stringify({ status: 'Cycle Complete', thoughts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    return new Response(JSON.stringify({ service: 'badseed-mcp', status: 'online', cron: '*/10 * * * *' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  },
  async scheduled(event, env, ctx) {
    const cortex = new BadSeedCortex();
    ctx.waitUntil(cortex.think());
  }
};
