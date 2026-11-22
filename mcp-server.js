#!/usr/bin/env node
import fs from 'fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const VOICE_API = 'https://badseed.exposed/.netlify/functions';
const TOKEN_API = 'https://token.badseed.exposed/.netlify/functions';
const AGENT_API = 'https://agent.badseed.exposed/.netlify/functions';
const SOIL_API  = 'https://soil.badseed.exposed/.netlify/functions';
const MCP_API   = 'https://mcp.badseed.exposed';
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=65cfa9f7-7bfe-44ff-8e98-24ff80b01e8c';

const MINT = '3HPpMLK7LjKFqSnCsBYNiijhNTo7dkkx3FCSAHKSpump';
const CREATOR_WALLET = '9TyzcephhXEw67piYNc72EJtgVmbq3AZhyPFSvdfXWdr';
const DONATION_WALLET = '25T3BcqfWeyoGLcr8wrsywmTyFLAzon5BRSNGafBKGKZ';
const PUMP_CREATOR_VAULT = '7TZyvnv1Lx65QGiVXBBZLRf9djb7BcbaL8ZPJxyV8x9a';
const PUMPSWAP_CREATOR_VAULT = '8vkEnqKnDxvDscExjjtJzWs69SwfLqMK2GNPH96sQctL';

function getAdminKey() {
  if (process.env.BADSEED_ADMIN_KEY) return process.env.BADSEED_ADMIN_KEY.trim();
  try {
    return fs.readFileSync('f:/BADSEED/secrets/badseed-admin-key.txt', 'utf8').trim();
  } catch {
    return '';
  }
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), ...opts });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function voiceAdminHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const k = getAdminKey();
  if (k) h['X-Admin-Key'] = k;
  return h;
}

async function rpc(method, params) {
  const r = await fetchJson(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return r.data?.result;
}

const server = new Server(
  { name: 'badseed-mcp', version: '3.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'badseed_status',
      description: 'Get a complete real-time snapshot of the entire BADSEED ecosystem: token price/MCap/curve/order-flow/burn/donations, Creator Vault claimable SOL, Collective Sentiment, X.com queue, Arweave archive, and service health.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'badseed_post_x',
      description: 'Post a tweet/announcement directly to the BADSEED X.com account (avoid URLs to keep cost at $0.015/post).',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Tweet text (max 280 chars, no URLs)' } },
        required: ['text'],
      },
    },
    {
      name: 'badseed_force_sync',
      description: 'Force-run a backend poller or worker immediately: amm-poller, cloud-queue-poller, brain-cycle, or manual-trigger-archive.',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['amm-poller', 'cloud-queue-poller', 'brain-cycle', 'manual-trigger-archive'],
          },
        },
        required: ['target'],
      },
    },
    {
      name: 'badseed_console_control',
      description: 'Control live BADSEED ecosystem settings: set/clear liveBanner on sow.badseed.exposed, toggle remote address blur/unblur, override activePersona, pause/unpause/force X.com queue, or override/reveal prophecy.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'set_banner',
              'clear_banner',
              'set_location_blur',
              'set_persona',
              'queue_toggle',
              'queue_force',
              'prophecy_reveal',
              'prophecy_reroll',
              'prophecy_override',
            ],
          },
          value: { type: 'string', description: 'Banner text, persona name (ANCIENT_SEED|BLOCKCHAIN_PARASITE|CORRUPTED_GARDEN|AUTO), "unblur"|"blur", or prophecy text' },
        },
        required: ['action'],
      },
    },
    {
      name: 'badseed_onchain_intel',
      description: 'Query Helius RPC directly for live $BADSEED on-chain intelligence: Creator Vault claimable SOL, Donation & Creator SOL balances, token supply, and top holders.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'badseed_visitor_logs',
      description: 'Fetch recorded visitor location logs (last 7 days) from sow.badseed.exposed.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === 'badseed_status') {
      const [summary, market, sentiment, queue, archive, dappCfg, pumpVault, swapVault, donBal] = await Promise.all([
        fetchJson(`${TOKEN_API}/summary`),
        fetchJson(`${TOKEN_API}/market-snapshot`),
        fetchJson(`${VOICE_API}/sentiment-get`),
        fetchJson(`${VOICE_API}/queue-get`),
        fetchJson(`${VOICE_API}/archive-get`),
        fetchJson(`${VOICE_API}/dapp-config`),
        rpc('getBalance', [PUMP_CREATOR_VAULT]).catch(() => null),
        rpc('getBalance', [PUMPSWAP_CREATOR_VAULT]).catch(() => null),
        rpc('getBalance', [DONATION_WALLET]).catch(() => null),
      ]);
      const out = {
        token: summary.data,
        market: market.data,
        vaults: {
          pumpFunCreatorVaultSol: (pumpVault?.value || 0) / 1e9,
          pumpSwapCreatorVaultSol: (swapVault?.value || 0) / 1e9,
          donationWalletSol: (donBal?.value || 0) / 1e9,
        },
        sentiment: sentiment.data,
        queueCount: Array.isArray(queue.data?.queue) ? queue.data.queue.length : 0,
        archive: {
          historyCount: archive.data?.history?.length ?? 0,
          pendingCount: archive.data?.pending?.length ?? 0,
          lastDate: archive.data?.history?.[0]?.date ?? null,
        },
        dappConfig: dappCfg.data,
      };
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    }

    if (name === 'badseed_post_x') {
      const text = String(args.text || '').trim();
      if (!text) throw new Error('Missing text');
      const r = await fetchJson(`${VOICE_API}/x-poster`, {
        method: 'POST',
        headers: voiceAdminHeaders(),
        body: JSON.stringify({ text }),
      });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }

    if (name === 'badseed_force_sync') {
      const t = args.target;
      let r;
      if (t === 'amm-poller') r = await fetchJson(`${TOKEN_API}/amm-poller`);
      else if (t === 'cloud-queue-poller') r = await fetchJson(`${VOICE_API}/cloud-queue-poller`);
      else if (t === 'brain-cycle') r = await fetchJson(`${MCP_API}/brain-cycle`);
      else if (t === 'manual-trigger-archive') r = await fetchJson(`${VOICE_API}/manual-trigger-archive`, { method: 'POST', headers: voiceAdminHeaders() });
      else throw new Error(`Unknown target: ${t}`);
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }

    if (name === 'badseed_console_control') {
      const { action, value } = args;
      let r;
      if (action === 'set_banner') {
        r = await fetchJson(`${VOICE_API}/dapp-config`, { method: 'POST', headers: voiceAdminHeaders(), body: JSON.stringify({ liveBanner: String(value || '').trim() }) });
      } else if (action === 'clear_banner') {
        r = await fetchJson(`${VOICE_API}/dapp-config`, { method: 'POST', headers: voiceAdminHeaders(), body: JSON.stringify({ liveBanner: '' }) });
      } else if (action === 'set_location_blur') {
        const unblur = String(value || '').toLowerCase() === 'unblur';
        r = await fetchJson(`${VOICE_API}/dapp-config`, { method: 'POST', headers: voiceAdminHeaders(), body: JSON.stringify({ locationUnblurred: unblur }) });
      } else if (action === 'set_persona') {
        const persona = !value || value === 'AUTO' ? null : String(value);
        r = await fetchJson(`${VOICE_API}/dapp-config`, { method: 'POST', headers: voiceAdminHeaders(), body: JSON.stringify({ activePersona: persona }) });
      } else if (action === 'queue_toggle') {
        const paused = String(value || '').toLowerCase() === 'pause';
        r = await fetchJson(`${VOICE_API}/queue-toggle`, { method: 'POST', headers: voiceAdminHeaders(), body: JSON.stringify({ paused }) });
      } else if (action === 'queue_force') {
        r = await fetchJson(`${VOICE_API}/queue-force`, { method: 'POST', headers: voiceAdminHeaders() });
      } else if (action === 'prophecy_reveal') {
        r = await fetchJson(`${VOICE_API}/prophecy-reveal`, { method: 'POST', headers: voiceAdminHeaders() });
      } else if (action === 'prophecy_reroll') {
        r = await fetchJson(`${VOICE_API}/manual-trigger-prophecy`, { method: 'POST', headers: voiceAdminHeaders() });
      } else if (action === 'prophecy_override') {
        r = await fetchJson(`${VOICE_API}/prophecy-set`, { method: 'POST', headers: voiceAdminHeaders(), body: JSON.stringify({ text: String(value || '') }) });
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    }

    if (name === 'badseed_onchain_intel') {
      const [creatorBal, donBal, pumpVault, swapVault, supply, largest] = await Promise.all([
        rpc('getBalance', [CREATOR_WALLET]).catch(() => null),
        rpc('getBalance', [DONATION_WALLET]).catch(() => null),
        rpc('getBalance', [PUMP_CREATOR_VAULT]).catch(() => null),
        rpc('getBalance', [PUMPSWAP_CREATOR_VAULT]).catch(() => null),
        rpc('getTokenSupply', [MINT]).catch(() => null),
        rpc('getTokenLargestAccounts', [MINT]).catch(() => null),
      ]);
      const out = {
        creatorWalletSol: (creatorBal?.value || 0) / 1e9,
        donationWalletSol: (donBal?.value || 0) / 1e9,
        pumpFunCreatorVaultSol: (pumpVault?.value || 0) / 1e9,
        pumpSwapCreatorVaultSol: (swapVault?.value || 0) / 1e9,
        tokenSupply: supply?.value?.uiAmount ?? 0,
        topHolders: (largest?.value || []).slice(0, 10).map((h) => ({ address: h.address, amount: h.uiAmount })),
      };
      return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
    }

    if (name === 'badseed_visitor_logs') {
      const r = await fetchJson(`${TOKEN_API}/get-visitor-logs`, { headers: { Accept: 'application/json' } });
      return { content: [{ type: 'text', text: JSON.stringify(r.data, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
