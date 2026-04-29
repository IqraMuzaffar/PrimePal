# Database Tables

## Core Tables

### teachers
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, linked to Supabase Auth user |
| email | text | Unique |
| full_name | text | |
| is_admin | boolean | Admin flag for elevated privileges |
| created_at | timestamptz | |

### classrooms
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| teacher_id | uuid | FK → teachers |
| name | text | Classroom display name |
| grade_level | integer | 1-6 |
| section | text | Optional section label |
| class_code | text | Unique, auto-generated 6-char hex |
| created_at | timestamptz | |

### students
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| classroom_id | uuid | FK → classrooms |
| full_name | text | |
| avatar_url | text | DiceBear-generated avatar URL |
| secret_pin | text | 4-digit PIN (plaintext) |
| points | integer | Gamification score, default 0 |
| roll_number | text | Optional |
| created_at | timestamptz | |

## Interaction & Analytics Tables

### student_interactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK → students |
| classroom_id | uuid | FK → classrooms |
| interaction_type | text | mission, chat, spelling-bee, story-time, speaking |
| pillar | text | reading, writing, listening, speaking |
| correct | boolean | Whether the answer was correct |
| score | integer | Points earned |
| prompt | text | The question/prompt |
| response | text | Student's response |
| grade_level | integer | Grade at time of interaction |
| created_at | timestamptz | |

### missions_completed
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK → students |
| mission_type | text | daily, pillar |
| pillar | text | Optional |
| completed_at | timestamptz | |

### daily_rewards
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK → students |
| claimed_at | timestamptz | |
| points_awarded | integer | |

## Curriculum Tables

### snc_knowledge_base
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| content | text | Chunk text content |
| embedding | vector(1536) | OpenAI embedding |
| metadata | jsonb | `{ grade_level, book_title, chunk_id }` |
| created_at | timestamptz | |

### snc_topics
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | Topic name |
| grade_level | integer | |
| description | text | |

### snc_uploads
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| teacher_id | uuid | FK → teachers |
| file_name | text | Original filename |
| grade_level | integer | |
| book_title | text | |
| total_chunks | integer | |
| created_at | timestamptz | |

## Other Tables

### announcements
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| teacher_id | uuid | FK → teachers |
| classroom_id | uuid | Optional FK → classrooms |
| scope | text | classroom or grade |
| title | text | English title |
| body | text | English body |
| title_ur | text | Urdu title (bilingual) |
| body_ur | text | Urdu body (bilingual) |
| active | boolean | |
| created_at | timestamptz | |
