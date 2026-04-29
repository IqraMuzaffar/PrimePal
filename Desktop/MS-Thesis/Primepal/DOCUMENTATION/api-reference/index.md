# API Reference

Complete endpoint listing for the PrimePal API. All endpoints are under `/api/v1`.

The FastAPI backend auto-generates OpenAPI docs at:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## Endpoint Summary

### Auth (`/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/classroom/{class_code}/avatars` | None | List students for login grid |
| POST | `/auth/student/login` | None | Student login → JWT |
| POST | `/auth/student/register` | Teacher | Register new student |
| PATCH | `/auth/student/{id}/pin` | Teacher | Reset student PIN |
| POST | `/auth/teacher/login` | None | Teacher login |

### Classroom (`/classroom`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/classroom/` | Teacher | List teacher's classrooms |
| POST | `/classroom/` | Teacher | Create classroom |
| GET | `/classroom/{id}` | Teacher | Classroom detail + roster |
| POST | `/classroom/{id}/students/bulk` | Teacher | Bulk add students |
| DELETE | `/classroom/{id}/students/{sid}` | Teacher | Remove student |
| GET | `/classroom/{id}/active-topics` | Teacher | Get active topics |
| PUT | `/classroom/{id}/active-topics` | Teacher | Update active topics |

### Missions (`/missions`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/missions/daily` | Student | Get daily missions |
| POST | `/missions/daily/submit` | Student | Submit daily answers |
| GET | `/missions/pillar/{pillar}` | Student | Get pillar missions |
| POST | `/missions/pillar/{pillar}/submit` | Student | Submit pillar answers |
| GET | `/missions/weekly-progress` | Student | 7-day progress |
| GET | `/missions/completed` | Student | Today's completions |

### Chat (`/chat`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat` | Student | Bilingual RAG chatbot |

### Curriculum (`/curriculum`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/curriculum/upload` | Teacher | PDF → chunk → embed pipeline |
| POST | `/curriculum/embed` | Teacher | Re-embed chunks |
| GET | `/curriculum/uploads` | Teacher | Upload history |

### Spelling Bee (`/spelling-bee`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/spelling-bee/words` | Student | Generate words |
| POST | `/spelling-bee/evaluate` | Student | Check spelling |

### Story Time (`/story-time`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/story-time/story` | Student | Generate story |
| POST | `/story-time/evaluate` | Student | Check comprehension |

### Speaking (`/speaking`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/speaking/prompts` | Student | Get prompts |
| POST | `/speaking/evaluate` | Student | Basic eval |
| POST | `/speaking/evaluate-pro` | Student | Whisper eval (audio upload) |

### Rewards (`/rewards`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/rewards/daily-chest` | Student | Check availability |
| POST | `/rewards/daily-chest/claim` | Student | Claim daily chest |

### Evaluator (`/evaluator`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/evaluator/report/student/{id}` | Teacher | Student report |
| GET | `/evaluator/report/classroom/{id}` | Teacher | Classroom report |
| GET | `/evaluator/report/teacher` | Teacher | Teacher dashboard |

### Interactions (`/interactions`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/interactions` | Student | Log interaction |

### Announcements (`/announcements`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/announcements/` | Teacher | Create |
| GET | `/announcements/` | Teacher | List own |
| PATCH | `/announcements/{id}` | Teacher | Update |
| DELETE | `/announcements/{id}` | Teacher | Delete |
| GET | `/announcements/active/{classroom_id}` | None | Student-facing active |

### Topics (`/topics`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/topics` | None | List SNC topics |

### Admin (`/admin`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/teachers` | Admin | List teachers |
| POST | `/admin/teachers` | None* | Create teacher (invite code) |
| POST | `/admin/invite-codes` | Admin | Generate invite |
| GET | `/admin/validate-invite-code/{code}` | None | Check invite |
| GET | `/admin/classrooms` | Admin | List all classrooms |
| PATCH | `/admin/classrooms/{id}/reassign` | Admin | Reassign classroom |
| GET | `/admin/curriculum` | Admin | List curriculum |
| DELETE | `/admin/curriculum/{id}` | Admin | Delete chunk |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |

For detailed request/response schemas, see the [backend endpoints docs](../backend/endpoints/index.md) or the auto-generated Swagger UI at `/docs`.
