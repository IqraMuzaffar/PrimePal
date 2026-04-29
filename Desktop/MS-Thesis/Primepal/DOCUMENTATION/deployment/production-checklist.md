# Production Checklist

Pre-deployment verification. See `TICKETS/` for detailed tracking.

## Security

- [ ] Rotate `SECRET_KEY` from default value
- [ ] Rotate `STUDENT_JWT_SECRET` from default value
- [ ] Rotate all Supabase keys if previously exposed
- [ ] Rotate `OPENAI_API_KEY` if previously committed
- [ ] Ensure `.env` and `.env.local` are in `.gitignore`
- [ ] Ensure Docker build does not COPY `.env` files
- [ ] Add rate limiting to LLM endpoints (OpenAI budget protection)
- [ ] Add file upload size limits (PDF + audio)
- [ ] Add authentication to student-name listing endpoint
- [ ] Strip `correct_index` from story-time response (answer leak)
- [ ] Hash student PINs instead of storing plaintext
- [ ] Remove internal error details from admin error responses

## Configuration

- [ ] Set `ALLOWED_ORIGINS` to production frontend domain
- [ ] Make Redis URL configurable (currently hardcoded to localhost)
- [ ] Set `APP_ENV=production`
- [ ] Configure proper HTTPS/TLS

## Data Integrity

- [ ] Switch points system to atomic SQL increments (race condition fix)
- [ ] Fix hardcoded `grade_level: 0` in interactions endpoint

## Performance

- [ ] Singleton Supabase client (currently re-created per request)
- [ ] Fix N+1 query in classroom report endpoint
- [ ] Dynamic import for jsPDF on frontend (~500KB)

## Monitoring

- [ ] Set up logging (replace any remaining print statements)
- [ ] Configure error tracking (Sentry or similar)
- [ ] Monitor OpenAI API spend

## Status

Tracked in detail at `TICKETS/` directory. Tickets 01 (partial), 02, 04, 06, 08 are complete. Tickets 03, 05, 07 need discussion.
