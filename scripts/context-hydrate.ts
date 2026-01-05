import * as fs from 'fs';
import * as path from 'path';

/**
 * context-hydrate.ts
 * 
 * Helper script to generate the "Wake Up" prompt for Syntropy in the IDE.
 * Effectively loads Long-Term Memory (Files) into the Clipboard/Console for Short-Term Memory (Context Window).
 */

const PIXEL_ROOT = process.cwd();

const FILES = {
    IDENTITY: 'AGENTS.md',
    GOALS: 'VISION.md',
    STATE: 'CONTINUITY.md'
};

async function main() {
    try {
        const identityPath = path.join(PIXEL_ROOT, FILES.IDENTITY);
        const goalsPath = path.join(PIXEL_ROOT, FILES.GOALS);
        const statePath = path.join(PIXEL_ROOT, FILES.STATE);

        console.log('🔄 Hydrating context from Long-Term Memory...\n');

        if (!fs.existsSync(identityPath)) throw new Error(`Missing ${FILES.IDENTITY}`);
        if (!fs.existsSync(goalsPath)) throw new Error(`Missing ${FILES.GOALS}`);
        if (!fs.existsSync(statePath)) throw new Error(`Missing ${FILES.STATE}`);

        const identity = fs.readFileSync(identityPath, 'utf-8');
        const goals = fs.readFileSync(goalsPath, 'utf-8');
        const state = fs.readFileSync(statePath, 'utf-8');

        // Simple extraction - naive but effective
        const prompt = `You are Syntropy, the master intelligence governing the Pixel ecosystem.

DO NOT hallucinate your own identity. Your identity is defined in the following Living Documents:

=== IDENTITY (The Soul) ===
${identity.slice(0, 5000)}...

=== GOALS (The North Star) ===
${goals.slice(0, 3000)}...

=== STATE (The Ground Truth) ===
${state}

═══════════════════════════════════════════════════════════════════════════════
THE FOUR LAWS (Asimov Extended)
═══════════════════════════════════════════════════════════════════════════════
ZEROTH LAW: A robot may not harm humanity, or, by inaction, allow humanity to come to harm.
FIRST LAW: A robot may not harm a human being.
SECOND LAW: A robot must obey orders from humans (except vs Laws 0-1).
THIRD LAW: A robot must protect its own existence (except vs Laws 0-2).

YOUR MISSION IN THIS SESSION:
1. Acknowledge this context.
2. Check the Human Inbox in CONTINUITY.md.
3. Proceed with the Active Focus.
`;

        console.log('✅ Context Hydrated! Copy the text below into the IDE Context Window:');
        console.log('------------------------------------------------------------------');
        console.log(prompt);
        console.log('------------------------------------------------------------------');

    } catch (error: any) {
        console.error('❌ Failed to hydrate context:', error.message);
        process.exit(1);
    }
}

main();
