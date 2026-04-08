/**
 * Multi-adapter LLM layer.
 *
 * Switch provider with LLM_ADAPTER env var:
 *   LLM_ADAPTER=groq   — uses Groq + llama-3.3-70b (free)
 *   LLM_ADAPTER=openai — uses OpenAI gpt-4o-mini
 *   LLM_ADAPTER=claude — uses Anthropic claude-opus-4-6
 */

export async function callLLM(systemPrompt, userMessage) {
    const adapter = (process.env.LLM_ADAPTER || 'groq').toLowerCase();

    switch (adapter) {
        case 'groq': return callGroq(systemPrompt, userMessage);
        case 'openai': return callOpenAI(systemPrompt, userMessage);
        case 'claude': return callClaude(systemPrompt, userMessage);
        default:
            throw new Error(
                `Unknown LLM_ADAPTER: "${adapter}"\n` +
                `Valid options: groq, openai, claude`
            );
    }
}

// ── Groq ──────────────────────────────────────────────────────

async function callGroq(system, user) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set — get free key at console.groq.com');

    for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                ],
                max_tokens: 1500,
                temperature: 0.1,
            }),
        });

        // Rate limited — wait and retry
        if (res.status === 429) {
            const wait = attempt * 15000;
            console.log(`  Groq rate limited — waiting ${wait / 1000}s (attempt ${attempt}/3)`);
            await sleep(wait);
            continue;
        }

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Groq error ${res.status}: ${body}`);
        }

        const data = await res.json();
        return data.choices[0].message.content;
    }

    throw new Error('Groq rate limit exceeded after 3 retries. Wait 1 minute and try again.');
}

// ── OpenAI ────────────────────────────────────────────────────

async function callOpenAI(system, user) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            max_tokens: 1500,
            temperature: 0.1,
        }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
}

// ── Claude ────────────────────────────────────────────────────

async function callClaude(system, user) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-opus-4-6',
            max_tokens: 1500,
            system,
            messages: [{ role: 'user', content: user }],
        }),
    });

    if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
}

// ── Utility ───────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}