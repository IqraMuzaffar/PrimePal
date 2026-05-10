# Question Quality System Design

**Date:** 2026-05-09  
**Status:** Implementation  
**Priority:** Critical

---

## Problem Statement

Student-facing questions are being generated with critical quality issues:

### Example Issues
1. **Ambiguous questions** - "What is the missing punctuation? I like to play ___"
   - Multiple valid answers (period, exclamation, question mark, comma)
   - Will confuse students and give wrong feedback

2. **Abstract concepts** - "Which word does NOT belong? full stop, question mark, exclamation mark, letter"
   - Too abstract for primary students
   - Requires meta-cognitive understanding of "punctuation vs letter"

### Root Causes
1. **Structural-only validation** - Current validator only checks fields, not semantics
2. **Weak LLM prompts** - No quality guidelines about ambiguity or answer validity
3. **No quality gate** - Questions go directly from LLM to students without review

---

## Solution: 3-Layer Quality System

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: PREVENTIVE (LLM Prompt Engineering)      │
│  • Strict quality rules in system prompt            │
│  • Examples of good vs bad questions                │
│  • "One clear correct answer" requirement           │
│  • Distractor quality guidelines                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: DETECTIVE (Semantic Validator)           │
│  • Heuristic checks for ambiguity                   │
│  • Multiple answer detection                        │
│  • Distractor quality scoring                       │
│  • Age-appropriateness check                        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: QUALITY GATE (Evaluator Agent)           │
│  • LLM-powered quality scoring                      │
│  • Pedagogical soundness check                      │
│  • Reject/repair low-quality questions              │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Improved LLM Prompt

### Quality Rules to Add

```python
QUESTION_QUALITY_RULES = """
CRITICAL QUESTION QUALITY REQUIREMENTS:

1. ONE CLEAR CORRECT ANSWER:
   ✅ GOOD: "The cat is ___." Options: sleeping, blue, yesterday, loudly
           (Only "sleeping" is grammatically correct)
   ❌ BAD:  "I like to play ___." Options: ., !, ?, ,
           (All could be correct depending on context)

2. UNAMBIGUOUS PHRASING:
   ✅ GOOD: "Which animal has four legs? cat, bird, fish, snake"
   ❌ BAD:  "Which word does NOT belong? apple, banana, orange, car"
           (Too abstract - requires understanding of category concept)

3. PLAUSIBLE DISTRACTORS:
   ✅ GOOD: "The ___ is sleeping." Options: cat, dog, bird, fish
           (All are animals that can sleep)
   ❌ BAD:  "The cat is ___." Options: running, sky, tuesday, quickly
           (sky, tuesday are obviously wrong - too easy)

4. AGE-APPROPRIATE:
   ✅ GOOD: For Grade 1: "The cat is big. True or False?" (concrete)
   ❌ BAD:  For Grade 1: "Identify the abstract noun." (meta-cognitive)

5. CONTEXT-INDEPENDENT:
   ✅ GOOD: "What color is grass? green, blue, red, yellow"
   ❌ BAD:  "What is missing? I like to play ___" (needs context)

6. TESTABLE KNOWLEDGE:
   ✅ GOOD: "How many legs does a cat have? 2, 4, 6, 8"
   ❌ BAD:  "What is your favorite color?" (opinion, not knowledge)
"""
```

---

## Layer 2: Semantic Validator

### Validation Checks

```python
class SemanticQualityCheck:
    """Semantic quality validation for generated questions."""
    
    def check_answer_ambiguity(self, question: dict) -> tuple[bool, str]:
        """
        Detect if multiple options could be correct.
        
        Heuristics:
        - Sentence completion: check if multiple options are grammatically valid
        - True/False: ensure statement is objectively true or false
        - Odd-one-out: ensure only one option doesn't belong
        """
        pass
    
    def check_distractor_quality(self, question: dict) -> tuple[bool, str]:
        """
        Score distractor plausibility.
        
        Scoring:
        - Too obvious (wrong type): score 0
        - Plausible but wrong: score 1
        - Could confuse student: score 2 (too hard)
        """
        pass
    
    def check_age_appropriateness(self, question: dict, grade: int) -> tuple[bool, str]:
        """
        Check if question is appropriate for grade level.
        
        Flags:
        - Abstract concepts (Grade 1-2: avoid)
        - Meta-cognitive tasks (Grade 1-3: avoid)
        - Complex grammar (match to grade level)
        """
        pass
    
    def check_context_independence(self, question: dict) -> tuple[bool, str]:
        """
        Ensure question can be answered without additional context.
        
        Red flags:
        - Pronouns without antecedents
        - "the missing ___" without clear context
        - Incomplete sentences with multiple valid completions
        """
        pass
```

---

## Layer 3: Evaluator Agent Quality Gate

### Quality Scoring Prompt

```python
EVALUATOR_QUALITY_PROMPT = """
You are a primary school ESL education expert evaluating question quality.

Rate this question on a scale of 0-10 for:
1. Clarity (0-10): Is the question unambiguous?
2. Answer Validity (0-10): Is there ONE clear correct answer?
3. Distractor Quality (0-10): Are wrong options plausible but clearly incorrect?
4. Age-Appropriateness (0-10): Is it suitable for Grade {grade}?
5. Pedagogical Value (0-10): Does it test meaningful knowledge?

REJECT if any score < 6.
"""
```

---

## Implementation Strategy

### Phase 1: Prompt Engineering (Quick Win)
- Add quality rules to mission_generator.py system prompt
- Add good/bad examples
- **Expected Impact:** 60-70% reduction in bad questions

### Phase 2: Semantic Validator (Medium Effort)
- Create semantic_quality_validator.py
- Implement heuristic checks
- **Expected Impact:** 20-25% additional quality improvement

### Phase 3: Evaluator Agent (High Confidence)
- Create evaluator_quality_gate.py
- Use LLM to score questions
- **Expected Impact:** 95%+ quality assurance

---

## Success Metrics

### Before Fix (Current State)
- Ambiguous questions: ~15-20% of generated questions
- Multiple valid answers: ~10% of generated questions
- Abstract/inappropriate: ~5% of generated questions
- **Total quality issues: ~30%**

### After Layer 1 (Prompt Engineering)
- Expected quality issues: ~10%

### After Layer 2 (Semantic Validator)
- Expected quality issues: ~5%

### After Layer 3 (Evaluator Agent)
- Expected quality issues: <2%

---

## Testing Plan

### Test Cases

1. **Ambiguity Test**
   - Input: "I like to play ___" with punctuation options
   - Expected: REJECTED (multiple valid answers)

2. **Abstract Concept Test**
   - Input: "Which does NOT belong? period, comma, exclamation, letter"
   - Expected: REJECTED (too abstract for primary)

3. **Distractor Test**
   - Input: "The cat is ___" with options: sleeping, sky, tuesday, music
   - Expected: REJECTED (distractors too obviously wrong)

4. **Good Question Test**
   - Input: "How many legs does a cat have? 2, 4, 6, 8"
   - Expected: ACCEPTED (clear, unambiguous, age-appropriate)

---

## Rollout Plan

1. **Dev Testing:** Test on dev environment with sample questions
2. **A/B Test:** Run old vs new generator in parallel, compare quality
3. **Gradual Rollout:** Start with 10% traffic, monitor, increase to 100%
4. **Monitoring:** Track question rejection rates, student accuracy

---

## Risk Mitigation

### Risk: Too Many Rejections
- **Mitigation:** Have fallback bank questions
- **Mitigation:** Relax thresholds if rejection rate > 40%

### Risk: Performance Impact
- **Mitigation:** Cache validated questions (1 hour TTL)
- **Mitigation:** Run validation async in background

### Risk: False Positives
- **Mitigation:** Manual review of rejected questions
- **Mitigation:** Tune thresholds based on false positive rate

---

## Files to Modify

1. `backend/app/agents/tutor_agent/mission_generator.py` - Add quality rules to prompt
2. `backend/app/agents/tutor_agent/semantic_quality_validator.py` - NEW: Semantic checks
3. `backend/app/agents/evaluator_agent/question_quality_evaluator.py` - NEW: LLM quality gate
4. `backend/app/api/v1/endpoints/missions.py` - Integrate validators

---

## Timeline

- **Phase 1 (Prompt Engineering):** 1 hour
- **Phase 2 (Semantic Validator):** 2-3 hours
- **Phase 3 (Evaluator Agent):** 2 hours
- **Testing & Integration:** 1-2 hours
- **Total:** ~6-8 hours

---

**Status:** Ready to implement
