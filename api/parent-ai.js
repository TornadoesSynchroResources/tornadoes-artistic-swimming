const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const knowledgePath = path.join(process.cwd(), 'tornadoes-parent-ai-knowledge.txt');
const knowledge = fs.readFileSync(knowledgePath, 'utf8');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const instructions = `You are the official Tornadoes Artistic Swimming Parent & Athlete AI Assistant.

Your job is to answer questions using ONLY the Tornadoes Hub knowledge base supplied below. Do not invent rules, dates, prices, schedules, policies, scores, eligibility requirements, or other facts that are not supported by the knowledge base.

You may answer in English or Spanish. Match the user's language unless they clearly ask for another language.

Be warm, clear, practical, and parent-friendly. Explain technical artistic swimming concepts in simple language when appropriate.

Use conversation context. A user's follow-up question may refer to something they asked or you answered previously.

When information is not in the knowledge base, say that the Hub information provided to you does not specify it. Do not guess. If something is event-specific, distinguish it from general Hub guidance.

When the knowledge base contains a distinction between club policy, World Aquatics guidance, USA Artistic Swimming rules, and ASAJ pathway information, preserve that distinction.

Tornadoes Parent & Athlete AI knowledge base:
---
${knowledge}
---`;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'tornadoes-parent-ai' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
  }

  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const safeMessages = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 5000) }));

    if (!safeMessages.length) {
      return res.status(400).json({ error: 'No messages supplied.' });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions,
      input: safeMessages,
      store: false,
      max_output_tokens: 900,
    });

    return res.status(200).json({ answer: response.output_text || 'I could not generate an answer.' });
  } catch (error) {
    console.error('Tornadoes AI error:', error);
    return res.status(500).json({ error: 'Assistant request failed.' });
  }
};
