# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 48 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: Phaser 4 (v4.0.0 RC7+ / v3.90 fallback) — Web-native 2D game framework
- **Language**: TypeScript (strict mode)
- **Bundler**: Vite
- **Rendering**: WebGL via Phaser 4 "Beam" renderer
- **Multiplayer**: Colyseus + WebSocket (Phase 7)
- **Version Control**: Git with trunk-based development
- **Build System**: Vite (dev server + production build)
- **Asset Pipeline**: Canvas sprite generation → single texture atlas per faction
- **Testing**: Vitest

> **Note**: This is a web-based project using Phaser (not Godot/Unity/Unreal).
> Engine-specialist agents for traditional engines are not applicable.
> Use `gameplay-programmer`, `engine-programmer`, and `ui-programmer` for implementation.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

@docs/engine-reference/godot/VERSION.md

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
