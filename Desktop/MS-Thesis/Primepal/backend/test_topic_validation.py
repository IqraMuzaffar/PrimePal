"""
Test script for topic alignment validation in mission_generator.py
"""
import sys
import logging

# Add backend to path
sys.path.insert(0, "app")

from app.agents.tutor_agent.mission_generator import validate_topic_alignment

# Configure logging to see validation messages
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')

# Test cases
def test_topic_validation():
    print("\n" + "="*80)
    print("TESTING TOPIC ALIGNMENT VALIDATION")
    print("="*80)

    # Test Case 1: Questions match active topics
    print("\n--- Test Case 1: Questions match active topics ---")
    questions_1 = [
        {
            "id": 1,
            "question": "What color is the cat?",
            "task_type": "sentence_picture_match",
            "audio_text": "The cat is black",
            "passage": "",
            "urdu_hint": ""
        },
        {
            "id": 2,
            "question": "Which animal is a dog?",
            "task_type": "odd_one_out",
            "audio_text": "",
            "passage": "",
            "urdu_hint": ""
        },
        {
            "id": 3,
            "question": "Fill in the blank: I like to eat ___",
            "task_type": "fill_blank_word_bank",
            "audio_text": "",
            "passage": "",
            "urdu_hint": ""
        }
    ]
    active_topics_1 = ["Animals", "Food"]
    result_1 = validate_topic_alignment(questions_1, active_topics_1, "reading")
    print(f"Input: {len(questions_1)} questions, Topics: {active_topics_1}")
    print(f"Result: {len(result_1)} questions passed validation")
    print(f"Expected: 3 (all questions should pass)")
    assert len(result_1) == 3, "All questions should match"
    print("PASSED")

    # Test Case 2: Some questions don't match
    print("\n--- Test Case 2: Some questions don't match topics ---")
    questions_2 = [
        {
            "id": 1,
            "question": "What is the weather like today?",
            "task_type": "sentence_picture_match",
            "audio_text": "It is sunny",
            "passage": "",
            "urdu_hint": ""
        },
        {
            "id": 2,
            "question": "Which animal is a cat?",
            "task_type": "odd_one_out",
            "audio_text": "",
            "passage": "",
            "urdu_hint": ""
        },
        {
            "id": 3,
            "question": "How do you go to school?",
            "task_type": "fill_blank_word_bank",
            "audio_text": "I go by bus",
            "passage": "",
            "urdu_hint": ""
        }
    ]
    active_topics_2 = ["Animals", "Food"]
    result_2 = validate_topic_alignment(questions_2, active_topics_2, "reading")
    print(f"Input: {len(questions_2)} questions, Topics: {active_topics_2}")
    print(f"Result: {len(result_2)} questions passed validation")
    print(f"Expected: 1 (only the animal question should pass)")
    assert len(result_2) == 1, "Only 1 question should match"
    assert result_2[0]["question"] == "Which animal is a cat?", "Wrong question matched"
    print("PASSED")

    # Test Case 3: No active topics (accept all)
    print("\n--- Test Case 3: No active topics (accept all) ---")
    questions_3 = [
        {
            "id": 1,
            "question": "Random question about weather",
            "task_type": "sentence_picture_match",
            "audio_text": "",
            "passage": "",
            "urdu_hint": ""
        },
        {
            "id": 2,
            "question": "Random question about transportation",
            "task_type": "odd_one_out",
            "audio_text": "",
            "passage": "",
            "urdu_hint": ""
        }
    ]
    active_topics_3 = []
    result_3 = validate_topic_alignment(questions_3, active_topics_3, "reading")
    print(f"Input: {len(questions_3)} questions, Topics: {active_topics_3}")
    print(f"Result: {len(result_3)} questions passed validation")
    print(f"Expected: 2 (all questions should pass when no topics selected)")
    assert len(result_3) == 2, "All questions should pass when no topics"
    print("PASSED")

    # Test Case 4: Topic match in passage field
    print("\n--- Test Case 4: Topic match in passage field ---")
    questions_4 = [
        {
            "id": 1,
            "question": "Is this statement true?",
            "task_type": "passage_true_false",
            "audio_text": "",
            "passage": "The dog is playing with a ball in the park.",
            "urdu_hint": ""
        }
    ]
    active_topics_4 = ["Animals"]
    result_4 = validate_topic_alignment(questions_4, active_topics_4, "reading")
    print(f"Input: {len(questions_4)} questions, Topics: {active_topics_4}")
    print(f"Result: {len(result_4)} questions passed validation")
    print(f"Expected: 1 (topic found in passage)")
    assert len(result_4) == 1, "Question should match via passage"
    print("PASSED")

    # Test Case 5: Multi-word topic matching
    print("\n--- Test Case 5: Multi-word topic matching ---")
    questions_5 = [
        {
            "id": 1,
            "question": "Where is the family going?",
            "task_type": "sentence_picture_match",
            "audio_text": "The family is going to the park",
            "passage": "",
            "urdu_hint": ""
        }
    ]
    active_topics_5 = ["Family Members"]
    result_5 = validate_topic_alignment(questions_5, active_topics_5, "listening")
    print(f"Input: {len(questions_5)} questions, Topics: {active_topics_5}")
    print(f"Result: {len(result_5)} questions passed validation")
    print(f"Expected: 1 (partial word match on 'family')")
    assert len(result_5) == 1, "Question should match via word splitting"
    print("PASSED")

    # Test Case 6: Options field matching
    print("\n--- Test Case 6: Topic match in options field ---")
    questions_6 = [
        {
            "id": 1,
            "question": "Choose the correct word",
            "task_type": "fill_blank_word_bank",
            "audio_text": "",
            "passage": "",
            "urdu_hint": "",
            "options": [
                {"id": "a", "text": "cat"},
                {"id": "b", "text": "table"},
                {"id": "c", "text": "red"},
                {"id": "d", "text": "run"}
            ]
        }
    ]
    active_topics_6 = ["Animals"]
    result_6 = validate_topic_alignment(questions_6, active_topics_6, "writing")
    print(f"Input: {len(questions_6)} questions, Topics: {active_topics_6}")
    print(f"Result: {len(result_6)} questions passed validation")
    print(f"Expected: 1 (topic found in options)")
    assert len(result_6) == 1, "Question should match via options field"
    print("PASSED")

    print("\n" + "="*80)
    print("ALL TESTS PASSED")
    print("="*80 + "\n")

if __name__ == "__main__":
    test_topic_validation()
