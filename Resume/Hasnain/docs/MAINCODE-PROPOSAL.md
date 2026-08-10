# Maincode AI Research Residency — Project Proposal

## 1. Research Problem & Motivation

**Research area:** Agents (tool use, planning, memory, multi-agent systems, safe execution)

Pakistan ranks among the lowest in English proficiency globally despite English being the medium of instruction in most schools. In primary classrooms — particularly in low-resource settings — students learn through rote memorization with almost no interactive practice across the four core language pillars: reading, writing, listening, and speaking. Teachers themselves often lack training and tools to deliver effective ESL instruction. There are virtually no AI-based solutions addressing this gap in developing contexts.

I built PrimePal — a three-agent AI tutoring platform — and deployed it in a real school with 187 students and 12 teachers to address this. It worked: 15.9pp proficiency gain, 22.7pp speaking improvement. But the deployment exposed coordination problems that no multi-agent framework warns you about. My three agents share data through database tables, which keeps them modular, but in practice things broke silently. The bilingual pipeline failed on 15% of inputs because Roman Urdu has no standardized spelling. RAG missed relevant curriculum context 22% of the time. Whisper's ASR dropped for younger children's voices. The frustration-detection system triggered for nearly half the students during speaking tasks — far higher than anticipated.

These aren't theoretical concerns. Students got wrong-grade content. Teachers saw reports built on incomplete data. One agent's failure quietly cascaded through the others. Frameworks like AutoGen and CrewAI handle task decomposition well, but they don't address what happens when coordination silently breaks. This matters because the field is moving toward complex multi-agent systems in high-stakes environments — education, healthcare, finance — and the failure patterns I observed will repeat everywhere.

## 2. Core Contribution

The core contribution is threefold:

**A failure taxonomy** for multi-agent coordination, derived from 10K+ real production interactions — not synthetic benchmarks. I've identified four recurring failure classes: role boundary violations (agents acting outside their defined scope), context loss at handoffs (information dropped between agent boundaries), cascading errors (a single agent's failure propagating silently through the system), and modality-specific pipeline breakdowns (ASR, translation, and retrieval failures compounding at integration points).

**A coordination reliability protocol** — lightweight verification layers inserted at agent handoff points: role boundary checks, context completeness scores, and output consistency probes that catch breakdowns before they cascade.

**A public multi-agent reliability benchmark** built from real deployment data, enabling other researchers to test coordination robustness.

**Key technical hypothesis:** Agent coordination failures are not random — they follow classifiable, predictable patterns. If you add structured verification at handoff points between agents, you can catch 80%+ of cascading failures before they propagate, outperforming both rigid fixed pipelines and fully unconstrained delegation. I believe this structured-but-flexible middle ground is the missing layer in current multi-agent architectures, and I can prove it because I have the production data showing exactly where and how coordination breaks.

## 3. Methodology & Plan

**Approach:** I'll start from PrimePal's production logs — 10K+ interactions across reading, writing, listening, and speaking, plus teacher dashboard queries and AI report generations. I'll systematically categorize where coordination failed: bilingual translation breakdowns, RAG retrieval misses, ASR accuracy drops for young speakers, and cases where asynchronous logging fed stale data into teacher reports. From that analysis, I'll build an instrumented coordination framework with role boundary enforcement, structured handoff protocols, and automated failure detection at each agent boundary. I'll evaluate against existing benchmarks (AgentBench, GAIA) and real-world multi-step workflow scenarios, plus ablation studies isolating each verification layer's contribution.

**Milestones:**
- **Month 1:** Failure taxonomy finalized from production data. Handoff instrumentation framework built. Baselines established on existing benchmarks.
- **Month 3:** Coordination protocol operational — role enforcement, context verification, failure detection working end-to-end. Ablation studies complete. Draft technical report.
- **Month 6:** Public evaluation benchmark released. Conference submission targeting NeurIPS/ICML Agents Workshop or EMNLP Systems Track.

**Minimum viable result:** A validated failure taxonomy plus a coordination protocol that demonstrably improves multi-agent task completion rates over unstructured baselines.

**Resources:** GPU compute for multi-agent evaluation runs. Access to Maincode's agent infrastructure for real-world testing and validation beyond the education domain.

## 4. Novelty & Context

**Prior work:** AutoGen (Wu et al., 2023) and CrewAI orchestrate multi-agent systems but focus on task decomposition — how to split work — not what happens when coordination between agents breaks. CAMEL (Li et al., 2023) studies role-playing agents in synthetic settings. AgentBench (Liu et al., 2023) benchmarks individual agent capabilities but doesn't target multi-agent coordination failures. The pattern across the literature is clear: most research reports success stories. Systematic failure analysis from real deployments is largely absent.

**Differentiator:** I'm not speculating about what could go wrong — I have the data from what actually went wrong. 10K+ real interactions, real users (primary school children and teachers in Pakistan), real consequences when things failed. I also went through three design iterations in a live school responding to these failures, so the protocol I'm proposing is shaped by what broke and what we did to fix it in production — not what might break in a controlled demo. This empirical grounding is what separates this work from the current landscape of synthetic multi-agent evaluations.

## 5. Intended Outputs

**Primary:** Top-tier publication targeting NeurIPS/ICML Agents Workshop or EMNLP Systems Track — presenting the empirically-grounded failure taxonomy and coordination reliability protocol.

**Secondary:** Open-source coordination framework and multi-agent reliability benchmark. The framework will include pluggable verification modules (role boundary checks, context completeness scoring, output consistency probes) that any team can integrate into their multi-agent architecture. Findings are directly applicable to any production multi-agent system where agents need to coordinate reliably across complex, multi-step tasks — not just education, but healthcare, customer service, and enterprise workflows.
