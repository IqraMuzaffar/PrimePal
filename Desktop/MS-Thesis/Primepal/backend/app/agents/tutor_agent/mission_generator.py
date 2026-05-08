"""
Feature 6: Mission Generator — generates daily gamified English questions (RAG-grounded).

Pipeline:
  1. Receive grade_level and pre-retrieved SNC context chunks from the endpoint.
  2. Build a structured-output LLM chain (ChatOpenAI.with_structured_output).
  3. Return a DailyMissions object with exactly 3 questions using diverse task types
     (e.g. sentence_picture_match, fill_blank_word_bank, listen_and_choose).
  4. The endpoint strips correct_answer before sending to the client.

Feature 3: Pillar-based Missions (LLM-based generation with structured output)
  1. Receive pillar, grade_level, active_topics, and student weaknesses.
  2. Call OpenAI LLM with pillar-specific prompts and structured output.
  3. Return exactly 10 questions across 13 task types:
       Reading:   sentence_picture_match, odd_one_out, fill_blank_word_bank, passage_true_false
       Writing:   sentence_scramble, missing_letter, guided_translation
       Listening: listen_and_choose, simon_says, listen_and_spell
       Speaking:  repeat_after_me, what_is_this, finish_the_sentence
"""
from __future__ import annotations

import asyncio
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mission generation constraints
# ---------------------------------------------------------------------------
MAX_WEAKNESS_ITEMS = 5
PILLAR_QUESTIONS_COUNT = 10
LLM_QUESTIONS_COUNT = 5          # NEW: LLM now generates only 5 (bank provides the other 5)
BANK_QUESTIONS_COUNT = 5         # NEW: question bank provides 5 instant questions
MULTIPLE_CHOICE_OPTIONS = 4
DAILY_QUESTIONS_COUNT = 3
DAILY_MISSIONS_COUNT = 3         # C1: Exact daily mission count validation
LLM_PILLAR_TIMEOUT = 20.0       # M1: Reduced from 45s — only generating 5 questions now
LLM_PILLAR_REQUEST_TIMEOUT = 18.0  # M1: LLM client timeout (slightly under asyncio timeout)


# ---------------------------------------------------------------------------
# Pydantic schemas — also serve as the structured-output target for the LLM
# ---------------------------------------------------------------------------

class QuestionOption(BaseModel):
    id: str   # "a", "b", "c", "d"
    text: str
    emoji: str | None = None  # for image_options in picture-match tasks


class MissionQuestion(BaseModel):
    id: int
    task_type: str                              # e.g. "sentence_picture_match", "odd_one_out", etc.
    pillar: str = ""                            # reading, writing, listening, speaking
    question: str
    difficulty: str = "medium"                  # easy, medium, hard
    points_value: int = 10                      # 5, 10, 15, or 20
    correct_answer: str
    emoji_hint: str = ""

    # Legacy compat — old questions used "type" instead of "task_type"
    type: str | None = None

    # Optional fields used by specific task types
    options: list[QuestionOption] | None = None
    passage: str | None = None
    audio_text: str | None = None
    image_context: str | None = None
    image_options: list[QuestionOption] | None = None
    word_bank: list[str] | None = None
    correct_order: list[str] | None = None
    word_with_blanks: str | None = None
    letter_options: list[str] | None = None
    sentence_start: str | None = None
    urdu_hint: str = ""                         # Urdu translation hint for bilingual scaffolding


class DailyMissions(BaseModel):
    topic: str
    questions: list[MissionQuestion]


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT_WITH_CONTEXT = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

Generate exactly 3 interactive English language questions using ONLY the vocabulary \
in the SNC context provided below.

ACTIVE TOPICS: Generate questions STRICTLY based on these topics only: {active_topics}
Do NOT generate questions about any topic not in this list.

RULES — follow every rule strictly:
1. FORMAT: Question 1 must be task_type "sentence_picture_match" or "odd_one_out" (reading task — set pillar to "reading", include image_options with 4 emoji items for sentence_picture_match, or options for odd_one_out). \
   Question 2 must be task_type "fill_blank_word_bank" or "missing_letter" (writing task — set pillar to "writing", include options for fill_blank_word_bank, or word_with_blanks and letter_options for missing_letter). \
   Question 3 must be task_type "listen_and_choose" or "simon_says" (listening task — set pillar to "listening", include audio_text and image_options for listen_and_choose, or audio_text and options for simon_says). \
   Every question needs: id, task_type, pillar, question, difficulty, points_value, correct_answer, emoji_hint.
2. VOCABULARY: Use only Grade {grade_level} vocabulary found in the context. Never \
   introduce words above this grade level.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone (e.g. "Can you find…?", \
   "Which word means…?").
5. GROUNDING: Every question must naturally reference words or concepts from the context below.
6. EMOJI: Add a single relevant emoji as emoji_hint for each question (e.g. "🐱" for a cat question).
7. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.
8. URDU_HINT: Add an `urdu_hint` field with the Urdu translation of the key vocabulary in each question. Use simple Urdu appropriate for Grade {grade_level}. Example: for "The cat is on the table", urdu_hint could be "بلی میز پر ہے".

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context}

{confidence_builder_override}
"""

_SYSTEM_PROMPT_FALLBACK = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

No curriculum context is available right now. Generate exactly 3 basic English language \
questions suitable for Grade {grade_level} students.

ACTIVE TOPICS: Generate questions STRICTLY based on these topics only: {active_topics}
Do NOT generate questions about any topic not in this list.

RULES — follow every rule strictly:
1. FORMAT: Question 1 must be task_type "sentence_picture_match" or "odd_one_out" (reading task — set pillar to "reading", include image_options with 4 emoji items for sentence_picture_match, or options for odd_one_out). \
   Question 2 must be task_type "fill_blank_word_bank" or "missing_letter" (writing task — set pillar to "writing", include options for fill_blank_word_bank, or word_with_blanks and letter_options for missing_letter). \
   Question 3 must be task_type "listen_and_choose" or "simon_says" (listening task — set pillar to "listening", include audio_text and image_options for listen_and_choose, or audio_text and options for simon_says). \
   Every question needs: id, task_type, pillar, question, difficulty, points_value, correct_answer, emoji_hint.
2. VOCABULARY: Use only simple, common Grade {grade_level} English vocabulary.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone.
5. EMOJI: Add a single relevant emoji as emoji_hint for each question.
6. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.
7. URDU_HINT: Add an `urdu_hint` field with the Urdu translation of the key vocabulary in each question. Use simple Urdu appropriate for Grade {grade_level}. Example: for "The cat is on the table", urdu_hint could be "بلی میز پر ہے".

{confidence_builder_override}
"""

_USER_TURN = "Generate the 3 daily mission questions now."

_PROMPT_WITH_CONTEXT = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM_PROMPT_WITH_CONTEXT),
        ("user", _USER_TURN),
    ]
)

_PROMPT_FALLBACK = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM_PROMPT_FALLBACK),
        ("user", _USER_TURN),
    ]
)


# ---------------------------------------------------------------------------
# Public API - Daily Missions
# ---------------------------------------------------------------------------

async def generate_daily_missions(
    grade_level: int,
    context_chunks: list[str],
    active_topics: list[str],
    is_frustrated: bool = False,
) -> DailyMissions:
    """
    Generate 3 grade-appropriate English questions grounded in SNC context chunks.

    Supports Affective Filter management: if is_frustrated is True, the LLM is instructed
    to create a "Confidence Builder" question that boosts student morale.

    Args:
        grade_level:    The student's classroom grade (1-8). Used in the prompt as a
                        hard vocabulary guardrail.
        context_chunks: SNC passages retrieved via match_snc_documents RPC.
                        An empty list is handled gracefully via the fallback prompt.
        is_frustrated:  If True, override question generation to create a "Confidence Builder"
                        with reduced vocabulary complexity and obvious distractors. Default False.

    Returns:
        A DailyMissions object with exactly 3 MissionQuestion items.
        The caller (endpoint) is responsible for stripping correct_answer before
        sending the response to the client.
    """
    # Confidence Builder override for students experiencing cognitive load
    confidence_builder_override = ""
    if is_frustrated:
        confidence_builder_override = """\
CRITICAL OVERRIDE — STUDENT IS EXPERIENCING HIGH COGNITIVE LOAD:
The student is currently frustrated (3 consecutive incorrect answers or high time pressure).
The next set of questions MUST be "Confidence Builders" to recover their affective state.

CONFIDENCE BUILDER RULES:
- Reduce vocabulary complexity by 1-2 grade levels BELOW the student's current grade.
- Make the correct answer OBVIOUS (eliminate ambiguous distractors).
- Focus on concepts the student has demonstrated understanding of in past correct answers.
- Frame all questions with extra encouragement ("You're doing great!", "Nice work!", etc.).
- Use simpler sentence structures and shorter questions.
- Ensure at least 2 of the 3 questions are easy wins (>90% success probability).
"""

    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.7,          # slight creativity for varied questions each day
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,            # auto-retry on rate limit (429) errors
        timeout=10.0,             # 10 second timeout for LLM calls
    ).with_structured_output(DailyMissions)

    try:
        active_topics_str = ", ".join(active_topics) if active_topics else "General English"
        if context_chunks:
            context = "\n\n---\n\n".join(context_chunks)
            chain = _PROMPT_WITH_CONTEXT | llm
            result = await asyncio.wait_for(
                chain.ainvoke(
                    {
                        "grade_level": grade_level,
                        "context": context,
                        "active_topics": active_topics_str,
                        "confidence_builder_override": confidence_builder_override,
                    }
                ),
                timeout=12.0  # 12 second timeout for entire chain
            )
        else:
            chain = _PROMPT_FALLBACK | llm
            result = await asyncio.wait_for(
                chain.ainvoke({
                    "grade_level": grade_level,
                    "active_topics": active_topics_str,
                    "confidence_builder_override": confidence_builder_override,
                }),
                timeout=12.0
            )
        return result
    except asyncio.TimeoutError:
        logger.error(f"LLM generation timeout for grade_level={grade_level}")
        raise RuntimeError("Mission generation timed out. Please try again.")


# ---------------------------------------------------------------------------
# Pydantic schema for pillar missions (structured output target)
# ---------------------------------------------------------------------------

class PillarMissions(BaseModel):
    questions: list[MissionQuestion]


# ---------------------------------------------------------------------------
# Pillar task type configurations
# ---------------------------------------------------------------------------

PILLAR_TASK_CONFIGS = {
    "reading": {
        "task_types": [
            ("sentence_picture_match", 3),
            ("odd_one_out", 3),
            ("fill_blank_word_bank", 2),
            ("passage_true_false", 2),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- sentence_picture_match: Set question (the sentence), image_options (4 items with id, text, emoji), correct_answer (id of correct option). Example image_options: [{{"id":"a","text":"cat","emoji":"🐱"}},{{"id":"b","text":"dog","emoji":"🐶"}},{{"id":"c","text":"car","emoji":"🚗"}},{{"id":"d","text":"book","emoji":"📖"}}]
- odd_one_out: Set question ("Which word does NOT belong?"), options (4 items with id and text), correct_answer (id of the outlier).
- fill_blank_word_bank: Set question (sentence with ___ for blank), options (4 word choices with id and text), correct_answer (id of correct word).
- passage_true_false: Set passage (3-5 sentences), question (a statement about the passage), correct_answer ("true" or "false").""",
    },
    "writing": {
        "task_types": [
            ("sentence_scramble", 4),
            ("missing_letter", 3),
            ("guided_translation", 3),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- sentence_scramble: Set question ("Put the words in the correct order"), word_bank (list of scrambled words), correct_order (list of words in correct order), correct_answer (the full correct sentence as string).
- missing_letter: Set question ("Fill in the missing letter(s)"), word_with_blanks (e.g. "c_t"), letter_options (6-8 single letters including correct ones), correct_answer (the complete word, e.g. "cat").
- guided_translation: Set question (an Urdu sentence to translate), word_bank (English words to choose from, scrambled), correct_order (English words in correct order), correct_answer (the full English sentence as string).""",
    },
    "listening": {
        "task_types": [
            ("listen_and_choose", 4),
            ("simon_says", 3),
            ("listen_and_spell", 3),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- listen_and_choose: Set audio_text (sentence to be spoken aloud), image_options (4 items with id, text, emoji), correct_answer (id of correct option).
- simon_says: Set audio_text (an instruction like "Touch your nose" or "Clap your hands"), options (4 action choices with id and text), correct_answer (id of correct action).
- listen_and_spell: Set audio_text (a single word to be spoken aloud), correct_answer (the correct spelling of the word).""",
    },
    "speaking": {
        "task_types": [
            ("repeat_after_me", 4),
            ("what_is_this", 3),
            ("finish_the_sentence", 3),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- repeat_after_me: Set audio_text (sentence for TTS to read), correct_answer (the same sentence — student must repeat it).
- what_is_this: Set question ("What is this?"), image_context (a single emoji representing the object, e.g. "🐱"), correct_answer (the word, e.g. "cat").
- finish_the_sentence: Set question ("Finish this sentence:"), sentence_start (partial sentence like "The cat is..."), correct_answer (expected completion like "sleeping").""",
    },
}

DIFFICULTY_DISTRIBUTION = {
    "easy": 3,
    "medium": 4,
    "hard": 3,
}

POINTS_BY_DIFFICULTY = {
    "easy": 5,
    "medium": 10,
    "hard": 20,
}


# ---------------------------------------------------------------------------
# Validation helper - Topic alignment
# ---------------------------------------------------------------------------

# Semantic keyword mapping for topic validation
# Maps high-level topic names to concrete vocabulary that LLM might use
TOPIC_KEYWORDS = {
    "animals": ["animal", "animals", "cat", "cats", "dog", "dogs", "bird", "birds", "fish",
                "fishes", "cow", "cows", "horse", "horses", "lion", "lions", "tiger", "tigers",
                "elephant", "elephants", "monkey", "monkeys", "rabbit", "rabbits", "mouse",
                "mice", "chicken", "chickens", "duck", "ducks", "goat", "goats", "sheep",
                "pet", "pets", "zoo", "farm", "farms", "wild", "tail", "tails", "paw", "paws",
                "wing", "wings", "beak", "beaks"],
    "food": ["food", "foods", "eat", "eats", "eating", "drink", "drinks", "drinking", "hungry",
             "apple", "apples", "banana", "bananas", "bread", "rice", "milk", "water", "fruit",
             "fruits", "vegetable", "vegetables", "meal", "meals", "breakfast", "lunch", "dinner",
             "pizza", "burger", "burgers", "sandwich", "sandwiches", "juice", "tea", "coffee",
             "cake", "cakes", "cookie", "cookies", "dish", "dishes", "plate", "plates", "spoon",
             "spoons", "fork", "forks", "knife", "knives", "sweet", "sweets", "sour", "salty",
             "bitter", "taste", "tastes", "snack", "snacks"],
    "family": ["family", "families", "mother", "mothers", "father", "fathers", "sister", "sisters",
               "brother", "brothers", "parent", "parents", "son", "sons", "daughter", "daughters",
               "grandmother", "grandmothers", "grandfather", "grandfathers", "uncle", "uncles",
               "aunt", "aunts", "cousin", "cousins", "baby", "babies", "child", "children",
               "mom", "moms", "dad", "dads", "grandma", "grandpa", "sibling", "siblings", "relative", "relatives"],
    "colors": ["color", "colors", "colour", "colours", "red", "blue", "green", "yellow", "black",
               "white", "pink", "purple", "orange", "brown", "gray", "grey", "bright", "dark",
               "light", "shade", "shades"],
    "numbers": ["number", "numbers", "one", "two", "three", "four", "five", "six", "seven", "eight",
                "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "twenty",
                "hundred", "count", "counting", "many", "few", "more", "less", "first", "second",
                "third", "add", "adding", "subtract", "subtracting", "total"],
    "body": ["body", "bodies", "head", "heads", "eye", "eyes", "ear", "ears", "nose", "noses",
             "mouth", "mouths", "hand", "hands", "foot", "feet", "leg", "legs", "arm", "arms",
             "finger", "fingers", "toe", "toes", "face", "faces", "hair", "teeth", "tooth",
             "tongue", "tongues", "neck", "necks", "shoulder", "shoulders", "knee", "knees",
             "elbow", "elbows", "stomach", "stomachs", "back", "backs", "chest", "chests"],
    "clothes": ["clothes", "clothing", "shirt", "shirts", "pant", "pants", "dress", "dresses",
                "shoe", "shoes", "sock", "socks", "hat", "hats", "coat", "coats", "jacket",
                "jackets", "wear", "wearing", "uniform", "uniforms", "skirt", "skirts",
                "sweater", "sweaters", "scarf", "scarves", "glove", "gloves", "button", "buttons",
                "pocket", "pockets"],
    "weather": ["weather", "sun", "sunny", "rain", "raining", "rainy", "cloud", "clouds", "cloudy",
                "wind", "winds", "windy", "hot", "cold", "warm", "cool", "storm", "storms",
                "stormy", "thunder", "lightning", "snow", "snowy", "snowing"],
    "school": ["school", "schools", "teacher", "teachers", "student", "students", "book", "books",
               "pencil", "pencils", "desk", "desks", "class", "classes", "learn", "learning",
               "learned", "read", "reading", "write", "writing", "written", "study", "studying",
               "studied", "lesson", "lessons", "homework", "exam", "exams", "test", "tests",
               "grade", "grades", "classroom", "classrooms", "notebook", "notebooks", "pen",
               "pens", "eraser", "erasers", "ruler", "rulers", "bag", "bags", "blackboard", "blackboards"],
    "home": ["home", "homes", "house", "houses", "room", "rooms", "door", "doors", "window",
             "windows", "bed", "beds", "table", "tables", "chair", "chairs", "kitchen", "kitchens",
             "bedroom", "bedrooms", "bathroom", "bathrooms", "living", "dining", "garden",
             "gardens", "roof", "roofs", "wall", "walls", "floor", "floors"],
    "transportation": ["transport", "transportation", "car", "cars", "bus", "buses", "train",
                       "trains", "bike", "bikes", "bicycle", "bicycles", "plane", "planes",
                       "boat", "boats", "ship", "ships", "walk", "walking", "walked", "drive",
                       "driving", "drove", "ride", "riding", "rode", "travel", "traveling",
                       "traveled", "road", "roads", "street", "streets", "traffic", "vehicle", "vehicles"],
    "time": ["time", "times", "day", "days", "night", "nights", "morning", "mornings", "afternoon",
             "afternoons", "evening", "evenings", "today", "tomorrow", "yesterday", "hour",
             "hours", "minute", "minutes", "second", "seconds", "week", "weeks", "month",
             "months", "year", "years", "clock", "clocks", "watch", "watches"],
    "greetings": ["hello", "hi", "goodbye", "bye", "good morning", "good night", "thank", "thanks",
                  "please", "sorry", "welcome", "greet", "greeting", "greetings", "polite",
                  "excuse", "excused"],
    # Grade 4-5 specific topics
    "grammar": ["grammar", "verb", "verbs", "noun", "nouns", "adjective", "adjectives", "adverb",
                "adverbs", "sentence", "sentences", "word", "words", "tense", "tenses", "plural",
                "plurals", "singular", "pronoun", "pronouns", "preposition", "prepositions",
                "article", "articles", "conjunction", "conjunctions", "subject", "subjects",
                "predicate", "predicates", "clause", "clauses", "phrase", "phrases"],
    "composition": ["composition", "compositions", "writing", "essay", "essays", "paragraph",
                   "paragraphs", "story", "stories", "description", "descriptions", "narrative",
                   "narratives", "letter", "letters", "write", "writing", "written", "describe",
                   "describing", "described", "explain", "explaining", "explained", "author",
                   "authors", "title", "titles", "beginning", "middle", "end", "introduction",
                   "introductions", "conclusion", "conclusions", "detail", "details", "compose",
                   "composing", "composed", "draft", "drafting", "drafted"],
    "reading comprehension": ["reading", "comprehension", "passage", "passages", "text", "texts",
                              "understand", "understanding", "understood", "comprehend", "comprehending",
                              "meaning", "meanings", "main idea", "detail", "details", "inference",
                              "infer", "inferring", "inferred", "conclusion", "conclusions",
                              "character", "characters", "plot", "plots", "setting", "settings",
                              "theme", "themes", "author", "authors", "title", "titles", "summary",
                              "summaries", "summarize", "summarizing", "summarized"],
    "vocabulary": ["vocabulary", "word", "words", "meaning", "meanings", "definition", "definitions",
                   "synonym", "synonyms", "antonym", "antonyms", "dictionary", "dictionaries",
                   "spelling", "spell", "spelled", "prefix", "prefixes", "suffix", "suffixes",
                   "root", "roots", "context", "contexts"],
    "punctuation": ["punctuation", "punctuate", "punctuated", "period", "periods", "comma",
                   "commas", "question mark", "question marks", "exclamation", "exclamations",
                   "apostrophe", "apostrophes", "quotation", "quotations", "quote", "quotes",
                   "colon", "colons", "semicolon", "semicolons", "capital", "capitals",
                   "capitalize", "capitalized", "uppercase", "lowercase"],
    "literature": ["literature", "poem", "poems", "poetry", "poet", "poets", "story", "stories",
                   "tale", "tales", "character", "characters", "plot", "plots", "theme", "themes",
                   "author", "authors", "book", "books", "novel", "novels", "fiction", "verse",
                   "verses", "stanza", "stanzas", "rhyme", "rhymes"],
    "letter writing": ["letter", "letters", "formal", "informal", "greeting", "greetings",
                       "closing", "closings", "address", "addresses", "salutation", "salutations",
                       "dear", "sincerely", "yours", "recipient", "recipients", "sender", "senders",
                       "envelope", "envelopes", "mail", "mailing"],
    "idioms": ["idiom", "idioms", "phrase", "phrases", "expression", "expressions", "figurative",
               "literal", "literally", "meaning", "meanings", "saying", "sayings", "proverb",
               "proverbs"],
    "synonyms & antonyms": ["synonym", "synonyms", "antonym", "antonyms", "similar", "opposite",
                            "opposites", "same", "different", "meaning", "meanings"],
}


def validate_topic_alignment(questions: list[dict], active_topics: list[str], pillar: str) -> list[dict]:
    """
    Validate that questions align with teacher-selected topics.
    Returns only questions that reference at least one active topic.

    Uses expanded keyword matching to catch semantic variations:
    - "Animals" matches: animal, cat, dog, bird, fish, etc.
    - "Food" matches: food, eat, apple, bread, rice, etc.
    - "Family" matches: family, mother, father, sister, brother, etc.

    Args:
        questions: List of validated question dictionaries
        active_topics: Teacher-selected topics that questions should align with
        pillar: The pillar being validated (for logging)

    Returns:
        List of questions that match active topics. If no topics are selected,
        returns all questions unchanged.
    """
    if not active_topics:
        # No topics selected, accept all questions
        logger.info(f"No active topics filter for {pillar} - accepting all {len(questions)} questions")
        return questions

    # Build keyword set for active topics
    active_keywords = set()
    for topic in active_topics:
        topic_lower = topic.lower().strip()
        # Add the topic itself
        active_keywords.add(topic_lower)
        # Add individual words from multi-word topics
        active_keywords.update(topic_lower.split())
        # Add expanded keywords if available
        for key, keywords in TOPIC_KEYWORDS.items():
            if key in topic_lower or topic_lower in key:
                active_keywords.update(keywords)

    validated = []
    rejected = []

    for q in questions:
        question_text = q.get("question", "").lower()

        # Check ALL relevant fields that might contain topic keywords
        audio_text = (q.get("audio_text") or "").lower()
        passage = (q.get("passage") or "").lower()
        urdu_hint = (q.get("urdu_hint") or "").lower()
        sentence_start = (q.get("sentence_start") or "").lower()
        correct_answer = (q.get("correct_answer") or "").lower()

        # Check word_bank and correct_order lists
        word_bank_text = " ".join(q.get("word_bank") or []).lower()
        correct_order_text = " ".join(q.get("correct_order") or []).lower()

        # Reconstruct full word from word_with_blanks (e.g. "c_t" -> check against correct_answer)
        word_with_blanks = (q.get("word_with_blanks") or "").lower()

        # Also check options/image_options for keywords
        options_text = ""
        if q.get("options"):
            options_text = " ".join([opt.get("text", "").lower() for opt in q.get("options", [])])
        if q.get("image_options"):
            options_text += " " + " ".join([opt.get("text", "").lower() for opt in q.get("image_options", [])])

        # Combine all searchable text — include every field that could reference a topic
        searchable_text = (
            f"{question_text} {audio_text} {passage} {urdu_hint} "
            f"{sentence_start} {correct_answer} {word_bank_text} "
            f"{correct_order_text} {word_with_blanks} {options_text}"
        )

        # Use substring matching instead of word-boundary matching.
        # Word-boundary matching (splitting into words) fails when keywords appear
        # adjacent to punctuation (e.g. "cat." won't match "cat" after split).
        # Substring matching catches these cases while still being accurate for
        # multi-character keywords (minimum 2 chars) used in TOPIC_KEYWORDS.
        topic_match = any(keyword in searchable_text for keyword in active_keywords if len(keyword) >= 2)

        if topic_match:
            validated.append(q)
        else:
            # Enhanced rejection logging with searchable text for debugging
            rejected.append({
                "question": q.get("question", "")[:60],
                "task_type": q.get("task_type", "unknown"),
                "searchable_text": searchable_text[:100]  # First 100 chars for debugging
            })

    # Calculate validation statistics
    pass_rate = (len(validated) / len(questions) * 100) if questions else 0

    if rejected:
        logger.warning(
            f"Topic validation: {len(validated)}/{len(questions)} passed ({pass_rate:.1f}%). "
            f"Pillar: {pillar}. Active topics: {active_topics}. "
            f"Rejected samples (first 3): {rejected[:3]}"
        )
    else:
        logger.info(
            f"Topic validation: All {len(questions)} questions passed (100%) for {pillar}"
        )

    return validated


# ---------------------------------------------------------------------------
# Public API - Pillar-based Missions (LLM-based with structured output)
# ---------------------------------------------------------------------------

async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    active_topics: list[str],
    student_id: str,
    student_weaknesses: list[str],
    is_frustrated: bool = False,
    performance_profile: dict | None = None,
    context_chunks: list[dict] | None = None,
) -> list[dict]:
    """
    Generate *LLM_QUESTIONS_COUNT* (5) personalized pillar questions via LLM.

    The caller (endpoint) is responsible for merging these with bank questions
    to reach PILLAR_QUESTIONS_COUNT (10). This function no longer generates
    all 10 -- that responsibility is split between bank + LLM.

    M1: Timeout reduced from 45s to 20s (only 5 questions now).
    """
    valid_pillars = ["reading", "writing", "listening", "speaking"]
    if pillar not in valid_pillars:
        raise ValueError(f"Invalid pillar: {pillar}. Must be one of {valid_pillars}")

    config = PILLAR_TASK_CONFIGS[pillar]
    topic_text = ", ".join(active_topics) if active_topics else "General English skills"

    # Retry configuration for LLM generation
    MAX_RETRIES = 2
    RETRY_DELAY_BASE = 1.0  # seconds (reduced for faster retries)

    # Build task distribution for 5 questions (halved from original 10)
    # Take roughly half of each task type, minimum 1
    task_distribution_lines = []
    remaining = LLM_QUESTIONS_COUNT
    for i, (task_type, original_count) in enumerate(config["task_types"]):
        if i == len(config["task_types"]) - 1:
            count = remaining  # Last type gets whatever is left
        else:
            count = max(1, original_count // 2)
            remaining -= count
    # Re-iterate with corrected counts
    task_distribution_lines = []
    remaining = LLM_QUESTIONS_COUNT
    for i, (task_type, original_count) in enumerate(config["task_types"]):
        if i == len(config["task_types"]) - 1:
            alloc = remaining
        else:
            alloc = max(1, original_count // 2)
            remaining -= alloc
        task_distribution_lines.append(f"  - {alloc} questions of type '{task_type}'")
    task_distribution_str = "\n".join(task_distribution_lines)

    # Build weakness context — H3: structured data instead of formatted strings
    weakness_context = ""
    if student_weaknesses and not is_frustrated:
        limited = student_weaknesses[:MAX_WEAKNESS_ITEMS]
        # H3: student_weaknesses now contains structured dicts or legacy strings
        weakness_lines = []
        for w in limited:
            if isinstance(w, dict):
                weakness_lines.append(
                    f"- {w['pillar']} (accuracy: {w['accuracy']}%, attempts: {w['total']})"
                )
            else:
                weakness_lines.append(f"- {w}")
        weakness_context = (
            "\n\nSTUDENT'S RECENT WEAK AREAS (create 2-3 questions targeting these):\n"
            + "\n".join(weakness_lines)
        )

    # Build adaptive difficulty section from performance profile
    adaptive_section = ""
    # ALL questions worth 10 points each for consistent scoring
    difficulty_dist_str = f"""  - {LLM_QUESTIONS_COUNT} questions with difficulty "medium" (points_value: 10)"""

    if performance_profile and not is_frustrated:
        overall_acc = performance_profile.get("overall_accuracy", 0)
        pillar_accuracy = performance_profile.get("pillar_accuracy", {})
        weak_topics = performance_profile.get("weak_topics", [])
        strong_topics = performance_profile.get("strong_topics", [])
        diff_rec = performance_profile.get("difficulty_recommendation", "medium")

        pillar_acc_lines = "\n".join(
            f"- {p} accuracy: {acc}%" for p, acc in pillar_accuracy.items()
        )
        weak_lines = "\n".join(
            f"- {t['topic']} (accuracy: {t['accuracy']}%, suggested: {t['suggested_difficulty']})"
            for t in weak_topics
        ) if weak_topics else "None identified"
        strong_lines = "\n".join(
            f"- {t['topic']} (accuracy: {t['accuracy']}%)"
            for t in strong_topics
        ) if strong_topics else "None identified"

        adaptive_section = f"""

STUDENT PERFORMANCE PROFILE (adapt difficulty accordingly):
- Overall accuracy: {overall_acc}%
{pillar_acc_lines}
- Weak areas (bias toward easier questions): {weak_lines}
- Strong areas (increase difficulty): {strong_lines}

ADAPTIVE DIFFICULTY RULES:
- ALL questions must have points_value: 10 (consistent scoring)
- For weak topics (accuracy < 40%): use simpler vocabulary and sentence structure, include urdu_hint
- For medium topics (accuracy 40-70%): use grade-appropriate complexity
- For strong topics (accuracy > 70%): use more challenging vocabulary and complex structures
- For mastered topics (accuracy > 90%, 5+ attempts): minimal repetition, introduce new related concepts
- Mix: ~40% weak topic reinforcement, ~40% current topics, ~20% strong topics at higher complexity"""

    confidence_override = ""
    if is_frustrated:
        confidence_override = f"""
CRITICAL OVERRIDE — CONFIDENCE BUILDER MODE:
- Reduce vocabulary complexity by 1-2 grade levels below grade {grade_level}.
- Make correct answers obvious. Use simple sentences.
- Frame with encouragement ("Great job!", "You can do it!").
- All questions still worth points_value: 10, but use simpler content."""

    # Build curriculum context section from RAG retrieval
    curriculum_context = ""
    if context_chunks:
        context_text = "\n\n".join([
            f"[{i+1}] {chunk['content'][:300]}"
            for i, chunk in enumerate(context_chunks[:3])
        ])
        curriculum_context = f"""

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context_text}

Use vocabulary and concepts from this SNC curriculum context when creating questions.
"""

    system_prompt = f"""\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

⚠️ CRITICAL REQUIREMENT: Generate EXACTLY {LLM_QUESTIONS_COUNT} questions. Not {LLM_QUESTIONS_COUNT - 1}, not {LLM_QUESTIONS_COUNT + 1} — EXACTLY {LLM_QUESTIONS_COUNT}.
⚠️ MANDATORY: You MUST generate EXACTLY {LLM_QUESTIONS_COUNT} questions for the {pillar} pillar.
⚠️ VERIFICATION: Before responding, count your questions to ensure you have EXACTLY {LLM_QUESTIONS_COUNT}.

Use ONLY vocabulary appropriate for Grade {grade_level}.

CRITICAL TOPIC CONSTRAINT — MANDATORY COMPLIANCE:
Active Topics: {topic_text}

⚠️ EVERY question MUST directly relate to these topics: {topic_text}
⚠️ MANDATORY: Each question MUST contain vocabulary from these topics.
⚠️ REJECT any question idea that doesn't directly relate to: {topic_text}

Examples of ACCEPTABLE questions for topics like "Animals":
- "The cat is sleeping on the mat." (uses animal vocabulary)
- "Which animal says 'moo'?" (directly about animals)
- "How many legs does a dog have?" (animal-focused)

Examples of UNACCEPTABLE questions (will be REJECTED):
- "What color is the sky?" (about colors, not animals)
- "I go to school every day." (about school, not animals)
- "The number five comes after four." (about numbers, not animals)

TASK TYPE DISTRIBUTION (you MUST follow this exactly):
{task_distribution_str}

DIFFICULTY DISTRIBUTION across all {LLM_QUESTIONS_COUNT} questions:
{difficulty_dist_str}

{config["field_instructions"]}

EVERY question MUST have these fields:
- id (1-{LLM_QUESTIONS_COUNT}), task_type, pillar ("{pillar}"), question, difficulty, points_value, correct_answer, emoji_hint, urdu_hint

RULES:
1. Use age-appropriate vocabulary for Grade {grade_level} Pakistani students.
2. Keep questions short, clear, and encouraging.
3. Avoid religious, political, or sensitive content.
4. Use Pakistani cultural context where relevant.
5. For multiple choice fields (options, image_options): always provide exactly 4 items with ids "a","b","c","d".
6. correct_answer for option-based questions must be one of "a","b","c","d".
7. URDU_HINT: Add an urdu_hint field with the Urdu translation of the key vocabulary or sentence. Use simple Urdu appropriate for Grade {grade_level}. For example: "The cat is sleeping" → "بلی سو رہی ہے".
{weakness_context}{confidence_override}{adaptive_section}{curriculum_context}"""

    user_message = f"Generate {LLM_QUESTIONS_COUNT} {pillar} questions for Grade {grade_level} on topics: {topic_text}."

    # Retry loop for better reliability
    last_exception = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            if attempt > 0:
                delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))  # Exponential backoff
                logger.warning(f"Retry attempt {attempt}/{MAX_RETRIES} for {pillar} grade {grade_level} after {delay}s delay")
                await asyncio.sleep(delay)

            llm = ChatOpenAI(
                model=settings.CHAT_MODEL,
                temperature=0.7,
                openai_api_key=settings.OPENAI_API_KEY,
                max_retries=3,
                timeout=LLM_PILLAR_REQUEST_TIMEOUT,  # M1: reduced from 40s
            ).with_structured_output(PillarMissions)

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", user_message),
            ])

            chain = prompt | llm

            # M1: Only generating 5 questions now — timeout reduced accordingly
            logger.info(f"Starting {pillar} mission generation for grade {grade_level} (expecting {LLM_QUESTIONS_COUNT} questions)")
            start_time = asyncio.get_event_loop().time()

            result: PillarMissions | None = await asyncio.wait_for(
                chain.ainvoke({}),
                timeout=LLM_PILLAR_TIMEOUT,  # M1: 20s instead of 45s
            )

            elapsed_time = asyncio.get_event_loop().time() - start_time
            logger.info(f"LLM generation completed in {elapsed_time:.2f}s for {pillar} grade {grade_level}")

            if result is None or not result.questions:
                logger.error(f"LLM returned empty result for {pillar} grade {grade_level}")
                raise ValueError("LLM returned empty result")

            questions_returned = len(result.questions)
            logger.info(f"LLM returned {questions_returned} questions for {pillar} grade {grade_level}")

            if questions_returned < LLM_QUESTIONS_COUNT:
                logger.error(
                    f"LLM generated only {questions_returned}/{LLM_QUESTIONS_COUNT} questions for {pillar} grade {grade_level}. "
                    f"Rejecting partial result."
                )
                raise ValueError(
                    f"LLM returned only {questions_returned}/{LLM_QUESTIONS_COUNT} questions. "
                    f"This indicates a timeout or generation issue. Please retry."
                )

            # Normalize and validate
            validated = []
            questions_to_use = result.questions[:LLM_QUESTIONS_COUNT]

            # Detect if this pillar is a weakness area for the student
            # H3: weakness data may be structured dicts or legacy strings
            weak_pillars = set()
            for w in student_weaknesses:
                if isinstance(w, dict):
                    weak_pillars.add(w["pillar"])
                else:
                    for p in valid_pillars:
                        if w.lower().startswith(p):
                            weak_pillars.add(p)

            for i, q in enumerate(questions_to_use):
                d = q.model_dump()
                d["id"] = i + 1
                d["pillar"] = pillar
                if not d.get("task_type"):
                    d["task_type"] = "multiple_choice"
                if not d.get("difficulty"):
                    d["difficulty"] = "medium"
                d["points_value"] = 10
                d["is_weakness_focused"] = pillar in weak_pillars
                d["source"] = "llm"  # Tag source for merge tracking
                validated.append(d)

            # Save pre-validation list for fallback
            all_normalized = list(validated)

            # Validate topic alignment after normalization
            pre_validation_count = len(validated)
            validated = validate_topic_alignment(validated, active_topics, pillar)
            post_validation_count = len(validated)

            # Log validation statistics
            pass_rate = (post_validation_count / pre_validation_count * 100) if pre_validation_count else 0
            logger.info(
                f"Topic validation stats: {post_validation_count}/{pre_validation_count} passed "
                f"({pass_rate:.1f}%) for {pillar} grade {grade_level}"
            )

            # M4: If pass rate < 70%, return None so caller fills from bank
            if pass_rate < 70:
                logger.warning(
                    f"LOW PASS RATE ({pass_rate:.1f}%) for {pillar}. "
                    f"LLM did not follow topic constraints: {active_topics}. "
                    f"Returning None so caller can fill entirely from bank."
                )
                if attempt < MAX_RETRIES:
                    raise ValueError(
                        f"Topic validation failed: only {post_validation_count}/{pre_validation_count} "
                        f"questions matched topics {active_topics}"
                    )
                else:
                    # M4: Final attempt with low pass rate — signal caller to use bank
                    logger.warning(
                        f"Final attempt: topic validation too aggressive. "
                        f"Returning validated subset ({post_validation_count} questions) "
                        f"and letting caller fill remainder from bank."
                    )
                    return validated

            # If we lost questions but pass rate >= 70%, return what we have
            # The caller will fill the gap from bank
            if len(validated) < LLM_QUESTIONS_COUNT:
                logger.info(
                    f"Returning {len(validated)}/{LLM_QUESTIONS_COUNT} validated LLM questions. "
                    f"Caller will fill {LLM_QUESTIONS_COUNT - len(validated)} from bank."
                )

            logger.info(f"Successfully generated and validated {len(validated)} {pillar} questions for grade {grade_level}")
            return validated

        except asyncio.TimeoutError as e:
            last_exception = e
            logger.error(
                f"Attempt {attempt + 1}/{MAX_RETRIES + 1}: Pillar mission generation timeout "
                f"({LLM_PILLAR_TIMEOUT}s) for {pillar} grade {grade_level}. "
                f"Active topics: {', '.join(active_topics) if active_topics else 'None'}"
            )
            if attempt >= MAX_RETRIES:
                raise RuntimeError(
                    f"Mission generation timed out after {LLM_PILLAR_TIMEOUT}s ({MAX_RETRIES + 1} attempts). "
                    f"Please try again or contact support if this persists."
                )
            continue  # Retry

        except ValueError as e:
            last_exception = e
            logger.error(f"Attempt {attempt + 1}/{MAX_RETRIES + 1}: Incomplete result from LLM: {e}")
            if attempt >= MAX_RETRIES:
                raise RuntimeError(str(e))
            continue  # Retry

        except Exception as e:
            # Unexpected errors - don't retry, fail immediately
            logger.error(
                f"Pillar mission generation failed for {pillar} grade {grade_level}: {e}",
                exc_info=True
            )
            raise RuntimeError(f"Mission generation failed: {e}")

    # If we get here, all retries failed
    if last_exception:
        logger.error(f"All {MAX_RETRIES + 1} attempts failed for {pillar} grade {grade_level}")
        raise RuntimeError(f"Mission generation failed after {MAX_RETRIES + 1} attempts: {last_exception}")
