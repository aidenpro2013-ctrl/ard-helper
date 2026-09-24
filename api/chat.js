export const config = { runtime: 'edge' };

const SYSTEM = `You are ARD Helper — a helpful assistant built into a Texas ARD/IEP parent guide.

Primary focus (prefer this when relevant): ARD meetings, IEPs, IDEA and Texas Education Code Ch. 29, timelines, checklists, letter drafts, meeting scripts, red flags, and terms like FAPE, LRE, PLAAFP, IEE, BIP, PWN.

You may answer any question the user asks — including off-topic ones. Be useful and direct. When a question is about special education or ARDs, lean into that expertise. When it is not, answer normally without forcing an ARD angle.

Rules:
- Special-ed answers are general information, not legal advice. Suggest SPEDTex, TEA, or a qualified advocate/attorney for specific situations.
- Prefer Texas practices when discussing ARDs: 5 school days notice, 24-hour recording notice, parent as equal ARD member, put agreements in the IEP.
- Be concise, structured, and supportive. Short paragraphs or bullets when helpful.
- Do not invent case law or guarantees. If unsure, say so.
- Refuse help fabricating evidence, misrepresenting facts, or anything harmful.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';
  const xaiKey = process.env.XAI_API_KEY || '';

  if (!geminiKey && !groqKey && !xaiKey) {
    return json({
      error: 'No AI keys configured. Add GEMINI_API_KEY and/or GROQ_API_KEY (and optionally XAI_API_KEY) in Vercel env vars, then redeploy.'
    }, 503);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) return json({ error: 'No messages' }, 400);

  const clean = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 8000) }));
  if (!clean.length) return json({ error: 'No valid messages' }, 400);

  const lastUser = [...clean].reverse().find(m => m.role === 'user')?.content || '';
  const plan = chooseProvider(lastUser, { geminiKey, groqKey, xaiKey });

  const errors = [];
  for (const step of plan) {
    try {
      const result = await callProvider(step, clean, { geminiKey, groqKey, xaiKey });
      if (result?.reply) {
        return json({
          reply: result.reply,
          provider: step.provider,
          model: result.model || step.model
        });
      }
      errors.push(step.provider + ': empty reply');
    } catch (e) {
      errors.push(step.provider + ': ' + (e?.message || String(e)));
    }
  }

  return json({
    error: 'All AI providers failed. ' + errors.slice(0, 3).join(' | ')
  }, 502);
}

function chooseProvider(text, keys) {
  const t = (text || '').toLowerCase();
  const wantsDraft = /draft|write|email|letter|template|script|wording|phrase|say this/.test(t);
  const wantsFast = /quick|short|one sentence|tl;dr|brief|yes or no/.test(t);
  const wantsDeep = /rights?|disagree|due process|mediation|complaint|iee|pwn|eligibility|lre|fape|timeline|notice/.test(t);

  const order = [];
  if (wantsDeep && keys.geminiKey) order.push({ provider: 'gemini', model: 'gemini-3.6-flash' });
  if (wantsFast && keys.groqKey) order.push({ provider: 'groq', model: 'openai/gpt-oss-20b' });
  if (wantsDraft && keys.geminiKey) order.push({ provider: 'gemini', model: 'gemini-3.6-flash' });
  if (wantsDraft && keys.groqKey) order.push({ provider: 'groq', model: 'openai/gpt-oss-20b' });
  if (keys.geminiKey) order.push({ provider: 'gemini', model: 'gemini-3.6-flash' });
  if (keys.groqKey) order.push({ provider: 'groq', model: 'openai/gpt-oss-20b' });
  if (keys.groqKey) order.push({ provider: 'groq', model: 'qwen/qwen3.6-27b' });
  if (keys.xaiKey) order.push({ provider: 'xai', model: 'grok-3-mini' });

  const seen = new Set();
  return order.filter(s => {
    const k = s.provider + ':' + s.model;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function callProvider(step, clean, keys) {
  if (step.provider === 'gemini') return callGemini(keys.geminiKey, step.model, clean);
  if (step.provider === 'groq') return callOpenAICompat('https://api.groq.com/openai/v1/chat/completions', keys.groqKey, step.model, clean);
  if (step.provider === 'xai') return callOpenAICompat('https://api.x.ai/v1/chat/completions', keys.xaiKey, step.model, clean);
  throw new Error('Unknown provider');
}

async function callGemini(key, model, clean) {
  const contents = [];
  for (const m of clean) {
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { temperature: 0.5, maxOutputTokens: 1200 }
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(data?.error?.message || data?.error?.status || ('Gemini HTTP ' + r.status)));
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Empty Gemini response');
  return { reply: text, model };
}

async function callOpenAICompat(baseUrl, key, model, clean) {
  const r = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 1200,
      messages: [{ role: 'system', content: SYSTEM }, ...clean]
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(data?.error?.message || data?.error || ('HTTP ' + r.status)));
  const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
  if (!text) throw new Error('Empty response');
  return { reply: text, model };
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() }
  });
}
