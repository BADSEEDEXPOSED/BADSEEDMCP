import { BadSeedCortex } from './lib/cortex.js';
import consoleHtml from './console.html';

const COOKIE_NAME = 'badseed_gm_auth';
const MAX_AGE_SEC = 86400; // 24 hours

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function createAuthCookie(pinSecret) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `gm:${exp}`;
  const sig = await hmacHex(pinSecret, payload);
  return `${COOKIE_NAME}=${encodeURIComponent(`${payload}.${sig}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SEC}`;
}

async function isAuthenticated(request, pinSecret) {
  if (!pinSecret) return false;
  const val = getCookie(request, COOKIE_NAME);
  if (!val) return false;
  const dot = val.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = val.slice(0, dot);
  const sig = val.slice(dot + 1);
  if (!payload.startsWith('gm:')) return false;
  const exp = Number(payload.slice(3));
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(pinSecret, payload);
  return timingSafeEqual(sig, expected);
}

const LOCK_SCREEN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BADSEED // ACCESS LOCKED</title>
  <link rel="icon" href="/favicon.ico" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background: #020403; color: #c7f9cc;
      font-family: ui-monospace, 'SFMono-Regular', Consolas, 'Courier New', monospace;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .panel {
      width: min(360px, calc(100vw - 32px));
      padding: 28px 24px 24px;
      border: 1px solid rgba(127, 166, 80, 0.45);
      border-left: 2px solid #9ab886;
      border-radius: 2px 10px 2px 2px;
      background: linear-gradient(135deg, rgba(20, 32, 22, 0.72), rgba(4, 7, 5, 0.94));
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.8), inset 0 1px rgba(199, 249, 204, 0.1);
      text-align: center;
    }
    .kicker { font-size: 10px; letter-spacing: 0.24em; color: #7fa650; text-transform: uppercase; margin-bottom: 8px; }
    h1 { margin: 0 0 6px; font-size: 18px; letter-spacing: 0.18em; color: #eef5fc; font-weight: 600; }
    .sub { font-size: 11px; color: #8c9e90; margin: 0 0 22px; letter-spacing: 0.08em; }
    .pin-input {
      width: 100%; padding: 12px 14px; font-size: 24px; letter-spacing: 0.6em; text-align: center;
      background: rgba(0, 0, 0, 0.72); color: #ffffff;
      border: 1px solid rgba(154, 184, 134, 0.4); border-radius: 2px;
      outline: none; font-family: inherit;
    }
    .pin-input:focus { border-color: #9ab886; box-shadow: 0 0 14px rgba(127, 166, 80, 0.25); }
    .btn {
      margin-top: 14px; width: 100%; padding: 11px 16px;
      background: linear-gradient(115deg, rgba(127, 166, 80, 0.22), rgba(10, 16, 12, 0.9));
      border: 1px solid rgba(154, 184, 134, 0.55); border-left: 2px solid #c7f9cc;
      border-radius: 2px; color: #eef5fc; font: 600 11px/1 inherit;
      letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer;
    }
    .btn:hover { background: rgba(127, 166, 80, 0.34); color: #ffffff; }
    .btn:disabled { opacity: 0.5; cursor: wait; }
    .err { min-height: 18px; margin-top: 12px; font-size: 11px; color: #f87171; letter-spacing: 0.1em; }
    @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
    .shake { animation: shake 0.28s ease-in-out; }
  </style>
</head>
<body>
  <form class="panel" id="lock-form" autocomplete="off">
    <div class="kicker">BADSEED // MCP</div>
    <h1>GOD MODE CONSOLE</h1>
    <p class="sub">ENTER ACCESS PIN</p>
    <input id="pin" class="pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••" autofocus required />
    <button id="unlock-btn" class="btn" type="submit">UNLOCK</button>
    <div id="err" class="err"></div>
  </form>
  <script>
    const form = document.getElementById('lock-form');
    const pinEl = document.getElementById('pin');
    const btn = document.getElementById('unlock-btn');
    const errEl = document.getElementById('err');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = pinEl.value.trim();
      if (!pin) return;
      btn.disabled = true;
      errEl.textContent = '';
      try {
        const res = await fetch('/api/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        if (res.ok) {
          window.location.reload();
          return;
        }
        errEl.textContent = 'ACCESS DENIED';
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        pinEl.value = '';
        pinEl.focus();
      } catch {
        errEl.textContent = 'NETWORK ERROR';
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    const pinSecret = env.CONSOLE_PIN || '';

    // 1. Existing brain-cycle endpoint (used by master cron)
    if (p === '/.netlify/functions/brain-cycle' || p === '/brain-cycle') {
      const cortex = new BadSeedCortex(env.ADMIN_API_KEY || '');
      try {
        const thoughts = await cortex.think();
        return new Response(JSON.stringify({ status: 'Cycle Complete', thoughts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // 1b. Authenticated Voice Node proxy (injects X-Admin-Key server-side after verifying PIN session)
    if (p.startsWith('/api/voice/')) {
      const authed = await isAuthenticated(request, pinSecret);
      if (!authed) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Unlock console first' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }
      const endpoint = p.slice('/api/voice/'.length);
      const targetUrl = `https://badseed.exposed/.netlify/functions/${endpoint}${url.search}`;
      const fwdHeaders = new Headers();
      const ct = request.headers.get('Content-Type');
      if (ct) fwdHeaders.set('Content-Type', ct);
      if (env.ADMIN_API_KEY) fwdHeaders.set('X-Admin-Key', env.ADMIN_API_KEY);
      const body = request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined;
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: fwdHeaders,
        body,
      });
      const outHeaders = new Headers(upstream.headers);
      outHeaders.set('Cache-Control', 'no-store');
      return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
    }

    // 2. PIN unlock / lock endpoints
    if (p === '/api/unlock' && request.method === 'POST') {
      try {
        const body = await request.json();
        const submitted = String(body?.pin ?? '').trim();
        if (pinSecret && timingSafeEqual(submitted, pinSecret)) {
          const cookie = await createAuthCookie(pinSecret);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': cookie,
              'Cache-Control': 'no-store',
            },
          });
        }
      } catch {}
      return new Response(JSON.stringify({ ok: false, error: 'Invalid PIN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    if (p === '/api/lock' && request.method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // 3. Static icon assets (favicon/logos)
    if (p === '/favicon.ico' || p === '/logo192.png' || p === '/logo512.png' || p === '/logo.png' || p === '/cursoroff.gif' || p === '/cursoron.gif') {
      if (env.ASSETS) return env.ASSETS.fetch(request);
    }

    // 4. Console UI (PIN-protected)
    if (p === '/' || p === '/console.html') {
      const authed = await isAuthenticated(request, pinSecret);
      return new Response(authed ? consoleHtml : LOCK_SCREEN_HTML, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new Response(JSON.stringify({ service: 'badseed-mcp', status: 'online' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },

  async scheduled(event, env, ctx) {
    const cortex = new BadSeedCortex(env.ADMIN_API_KEY || '');
    ctx.waitUntil(cortex.think());
  },
};
