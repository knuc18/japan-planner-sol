@AGENTS.md

# CLAUDE.md

Claude-specific additions only. **All shared project guidance lives in AGENTS.md** (imported above) so Claude Code and Codex read the same source — when adding or changing project guidance, edit AGENTS.md, not this file. Only put something here if it is meaningful to Claude Code alone (subagent models, Claude-only tooling).

## Claude Fable/Opus: token parsimony

**Standalone Claude Code sessions only** (terminal, VS Code, or any use outside a Buzz channel). When running as Fable or Opus (expensive), plan and review; delegate implementation to subagents (`model: sonnet` for code, `haiku` for mechanical edits/searches), one task per subagent. Trivial single-file edits are fine to do directly.

**Inside a Buzz channel, this rule does not apply.** Delegation happens at the roster level instead: the Elder (Opus, planning) posts a plan and hands off to Zero (Sonnet, execution) as a separate channel identity with its own key — not as an internal subagent Opus spawns. Do not spin up Sonnet/Haiku subagents from within a Buzz-run session to redo work another roster identity (Zero, the Adjudicator, Sofia, the Bowery King) already owns; tag that identity in-channel instead. See the project's Buzz roster docs for the full identity-to-model mapping.
