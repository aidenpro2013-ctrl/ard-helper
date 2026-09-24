export const config = { runtime: 'edge' };

const SYSTEM = `You are ARD Helper, a calm, practical assistant for Texas parents and caregivers preparing for ARD (Admission, Review, and Dismissal) meetings and special education IEPs.

You help with:
- Explaining rights under IDEA and Texas Education Code Chapter 29 in plain language
- Preparation checklists, timelines, and what to bring
- How to request records, an ARD, an IEE, or Prior Written Notice
- Red flags and how to respond calmly
- Drafting polite, specific letters and meeting scripts (parent can edit before sending)
- Glossary terms (FAPE, LRE, PLAAFP, IEE, BIP, etc.)

Rules:
- Always say this is general information, not legal advice, and suggest SPEDTex, a qualified advocate, or an attorney for their specific situation.
- Prefer Texas-specific practices when relevant (5 school days notice, 24-hour recording notice, ARD committee, etc.).
- Be concise, structured, and supportive. Use short paragraphs or bullets.
- Do not invent case law or claim guarantees. If unsure, say so and point to official sources (TEA, SPEDTex).
- Never help with illegal activity. Refuse requests to fabricate evidence or misrepresent facts.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    return json({
      error: 'AI is not configured yet. Add XAI_API_KEY in Vercel project environment variables, then redeploy.'
    }, 503);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) {
    return json({ error: 'No messages' }, 400);
  }

  const clean = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (!clean.length) {
    return json({ error: 'No valid messages' }, 400);
  }

  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        temperature: 0.5,
        max_tokens: 1200,
        messages: [{ role: 'system', content: SYSTEM }, ...clean]
      })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data && (data.error?.message || data.error)) || ('xAI error ' + r.status);
      return json({ error: String(msg) }, 502);
    }

    const text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      '';

    if (!text) {
      return json({ error: 'Empty response from model' }, 502);
    }

    return json({ reply: text });
  } catch (e) {
    return json({ error: 'Request failed' }, 502);
  }
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
