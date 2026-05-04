"""
Performance test for chatbot - measures timing of each pipeline step.

Run with: python test_chatbot_performance.py
"""
import asyncio
import time
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings
from app.agents.tutor_agent.chatbot import (
    translate_to_english,
    retrieve_grade_filtered_chunks,
    get_guardrailed_response
)
from app.core.supabase_client import get_supabase_admin

async def measure_chatbot_performance():
    """Measure timing of each step in the chatbot pipeline."""

    print("=" * 70)
    print("CHATBOT PERFORMANCE TEST")
    print("=" * 70)
    print()

    # Test query
    test_query = "Noun kya hota hai?"  # "What is a noun?" in Roman Urdu
    grade_level = 3

    print(f"Test Query: {test_query}")
    print(f"Grade Level: {grade_level}")
    print()

    # Initialize Supabase
    supabase = get_supabase_admin()

    # Step 1: Translation
    print("Step 1: Translation (gpt-4o-mini)")
    print("-" * 70)
    start = time.time()
    translated = await translate_to_english(test_query)
    translation_time = time.time() - start
    print(f"✓ Translated: '{translated}'")
    print(f"⏱  Time: {translation_time:.2f}s")
    print()

    # Step 2: Embedding + Vector Search
    print("Step 2: Embedding + Vector Search")
    print("-" * 70)
    start = time.time()
    chunks = await retrieve_grade_filtered_chunks(
        query=translated,
        grade_level=grade_level,
        supabase_admin_client=supabase,
        match_count=5
    )
    retrieval_time = time.time() - start
    print(f"✓ Retrieved {len(chunks)} chunks")
    if chunks:
        print(f"  First chunk preview: {chunks[0][:100]}...")
    print(f"⏱  Time: {retrieval_time:.2f}s")
    print()

    # Step 3: LLM Response Generation
    print("Step 3: LLM Response Generation")
    print("-" * 70)
    start = time.time()
    response = await get_guardrailed_response(
        original_message=test_query,
        translated_message=translated,
        grade_level=grade_level,
        context_chunks=chunks
    )
    llm_time = time.time() - start
    print(f"✓ Generated response:")
    print(f"  Bilingual: {response.bilingual_reply[:150]}...")
    print(f"  English: {response.english_reply[:150]}...")
    print(f"⏱  Time: {llm_time:.2f}s")
    print()

    # Total
    total_time = translation_time + retrieval_time + llm_time

    print("=" * 70)
    print("PERFORMANCE SUMMARY")
    print("=" * 70)
    print(f"Translation:        {translation_time:>6.2f}s ({translation_time/total_time*100:>5.1f}%)")
    print(f"Embedding + Search: {retrieval_time:>6.2f}s ({retrieval_time/total_time*100:>5.1f}%)")
    print(f"LLM Generation:     {llm_time:>6.2f}s ({llm_time/total_time*100:>5.1f}%)")
    print(f"{'─' * 70}")
    print(f"TOTAL TIME:         {total_time:>6.2f}s")
    print()

    # Analysis
    print("BOTTLENECK ANALYSIS:")
    print("-" * 70)

    slowest = max([
        ("Translation", translation_time),
        ("Retrieval", retrieval_time),
        ("LLM Generation", llm_time)
    ], key=lambda x: x[1])

    print(f"🔴 Slowest step: {slowest[0]} ({slowest[1]:.2f}s)")
    print()

    if total_time > 3:
        print("⚠️  SLOW: Total time > 3s - user will perceive as slow")
    elif total_time > 2:
        print("⚡ MODERATE: Total time 2-3s - acceptable but could be faster")
    else:
        print("✅ FAST: Total time < 2s - good performance")

    print()
    print("OPTIMIZATION RECOMMENDATIONS:")
    print("-" * 70)

    if translation_time > 0.5:
        print("• Translation is slow - consider:")
        print("  - Skip translation if message is already in English")
        print("  - Cache common translations")
        print("  - Use faster translation model")

    if retrieval_time > 1.0:
        print("• Retrieval is slow - consider:")
        print("  - Check pgvector index is created")
        print("  - Reduce match_count (currently 5)")
        print("  - Use faster embedding model")

    if llm_time > 2.0:
        print("• LLM generation is slow - consider:")
        print("  - Use streaming (already implemented)")
        print("  - Reduce max_tokens")
        print("  - Use faster model variant")

    if total_time > 1.5:
        print("• Overall optimization:")
        print("  - Frontend shows 'Thinking...' during steps 1-2")
        print("  - Add intermediate progress messages")
        print("  - Parallelize translation + embedding prep")

    print()

if __name__ == "__main__":
    try:
        asyncio.run(measure_chatbot_performance())
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
