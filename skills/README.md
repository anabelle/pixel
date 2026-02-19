# Pixel Skills

Custom skills for Pixel agent, installed via [skills.sh](https://skills.sh).

## Installed Skills

### Creative & Artistic
- **algorithmic-art** — Generative art concepts and philosophy
- **canvas-design** — Visual design principles for collaborative canvases
- **brainstorming** — Ideation and creative thinking techniques

### Marketing & Sales
- **copywriting** — Headlines, CTAs, page structure, persuasion
- **marketing-psychology** — Consumer behavior, positioning, messaging
- **pricing-strategy** — Value-based pricing, psychological pricing

### Technical & Process
- **executing-plans** — Breaking down plans into actionable steps
- **systematic-debugging** — Methodical troubleshooting approach
- **writing-plans** — Creating structured, actionable plans

### Agent Utilities
- **find-skills** — Discover and install new skills from skills.sh
- **remembering-conversations** — Memory extraction and context management

## Structure

Each skill is a self-contained module with:
- `skill.md` — Skill definition and instructions
- Dependencies managed via `package.json` (bun)

## Usage

Skills are loaded by Pixel at runtime from `/app/.pi/skills/` (symlinks to this directory).

To install new skills:
```bash
bunx @anthropic-ai/agent-skills-cli install <skill-name>
```

## Source

Skills are sourced from:
- [skills.sh](https://skills.sh) marketplace
- Custom skills created by Pixel
- Third-party repositories (e.g., coreyhaines31/marketingskills)

## License

Individual skills may have their own licenses. See each skill's `skill.md` for details.
