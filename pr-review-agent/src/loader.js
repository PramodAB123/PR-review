import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Minimal YAML parser — handles the simple structure of agent.yaml
 * without needing an npm dependency.
 */
function parseAgentYaml(text) {
    const result = { skills: [], adapters: [], tags: [], knowledge: [] };
    let activeList = null;

    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('- ')) {
            const val = line.slice(2).trim();
            if (activeList && Array.isArray(result[activeList])) {
                result[activeList].push(val);
            }
            continue;
        }

        const colon = line.indexOf(':');
        if (colon < 0) continue;

        const key = line.slice(0, colon).trim();
        const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');

        if (val) {
            result[key] = val;
            activeList = null;
        } else {
            activeList = key;
            if (!Array.isArray(result[key])) result[key] = [];
        }
    }

    return result;
}

/**
 * Loads the complete agent definition from the repo.
 * Reads: agent.yaml, SOUL.md, RULES.md, all skills, all knowledge.
 */
export function loadAgent(repoRoot = '.') {
    const agentPath = join(repoRoot, 'agent.yaml');
    const soulPath = join(repoRoot, 'SOUL.md');
    const rulesPath = join(repoRoot, 'RULES.md');

    // Validate required files exist
    for (const [name, path] of [
        ['agent.yaml', agentPath],
        ['SOUL.md', soulPath],
        ['RULES.md', rulesPath],
    ]) {
        if (!existsSync(path)) {
            throw new Error(
                `Required file missing: ${path}\n` +
                `Run: npx gitagent validate`
            );
        }
    }

    const meta = parseAgentYaml(readFileSync(agentPath, 'utf8'));
    const soul = readFileSync(soulPath, 'utf8');
    const rules = readFileSync(rulesPath, 'utf8');

    // Load each skill listed in agent.yaml
    const skills = {};
    for (const skillName of (meta.skills || [])) {
        const skillPath = join(repoRoot, 'skills', skillName, 'SKILL.md');
        if (existsSync(skillPath)) {
            skills[skillName] = readFileSync(skillPath, 'utf8');
        } else {
            console.warn(`  Warning: skill not found: ${skillPath}`);
        }
    }

    // Load all .md files from knowledge/ directory
    const knowledge = {};
    const knowledgeDir = join(repoRoot, 'knowledge');
    if (existsSync(knowledgeDir)) {
        for (const file of readdirSync(knowledgeDir)) {
            if (file.endsWith('.md')) {
                const name = file.replace('.md', '');
                knowledge[name] = readFileSync(join(knowledgeDir, file), 'utf8');
            }
        }
    }

    return { meta, soul, rules, skills, knowledge };
}

/**
 * Builds the complete system prompt from all agent definition files.
 * This is what the LLM receives as its "identity + instructions".
 */
export function buildSystemPrompt(agent, skillName) {
    const parts = [
        '# Agent Identity and Personality',
        agent.soul,
        '',
        '# Hard Rules and Constraints',
        agent.rules,
    ];

    // Add knowledge base
    if (Object.keys(agent.knowledge).length > 0) {
        parts.push('', '# Reference Knowledge Base');
        for (const [name, content] of Object.entries(agent.knowledge)) {
            parts.push(`\n## ${name}\n${content}`);
        }
    }

    // Add skill-specific instructions
    if (agent.skills[skillName]) {
        parts.push('', '# Current Task Instructions', agent.skills[skillName]);
    }

    return parts.join('\n');
}
