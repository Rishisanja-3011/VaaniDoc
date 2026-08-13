# VaaniDoc

VaaniDoc is a privacy-first, multilingual health-intake system for rural and semi-urban clinics. A patient joins a doctor using a permanent VAN code or QR code, describes symptoms by text or voice, and the doctor receives a structured English intake summary. It is an AI-assisted intake aid, never a diagnosis or treatment system.

## Architecture

```
Patient web app -> FastAPI API -> Supabase temporary tables
                        |
                        +-> Gemini structured extraction
                        +-> deterministic multilingual fallback
Doctor dashboard -> FastAPI API -> Supabase Auth / temporary intake queue
```

`patient-app` is the mobile-first patient flow. `doctor-dashboard` manages registration, QR codes, the prepared patient queue, and consultation completion. `hospital-admin` is a clearly labelled Phase 2 UI scaffold; it has no roster-management backend.

## Privacy model

Patient content is held only in `active_sessions`, `temporary_inputs`, and `temporary_intakes`. Foreign keys use `ON DELETE CASCADE`. Completing or cancelling a consultation deletes its session and all dependent content. A session has a 30-minute expiry and expired sessions are removed at API startup. The patient app has only an in-memory offline queue; it does not put symptoms or recordings in browser storage. Voice capture uses browser speech recognition and submits the reviewed transcript, not the audio recording.

## Requirements

- Python 3.11+ and Node.js 20+
- A Supabase project
- Optional Gemini API key (the safe deterministic fallback works without one)

## Environment

Create `backend/.env` from `backend/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
SUPABASE_SECRET_KEY=your-supabase-secret-or-service-role-key
GEMINI_API_KEY=
APP_BASE_URL=https://your-patient-app-domain
CORS_ORIGINS=https://your-patient-app-domain,https://your-doctor-dashboard-domain,https://your-hospital-admin-domain
PORT=8000
```

`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are accepted aliases for older Supabase projects. Never expose the secret/service-role key in a frontend variable or commit it. Copy the `.env.example` in each frontend and set only:

```env
VITE_API_URL=https://your-backend-domain
```

## Local setup

```powershell
# Database: run these in Supabase SQL Editor, in order
database/schema/schema.sql
database/migrations/002_add_negative_symptoms.sql

# Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:PYTHONPATH = 'backend'
uvicorn app.main:app --reload --port 8000

# In separate terminals
cd patient-app; npm install; npm run dev -- --port 5173
cd doctor-dashboard; npm install; npm run dev -- --port 5175
cd hospital-admin; npm install; npm run dev -- --port 5176
```

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd patient-app; npm test; npm run build
cd ..\doctor-dashboard; npm run lint; npm run build
cd ..\hospital-admin; npm run build
```

The extraction suite contains 20 multilingual accuracy cases (English, Hindi, Gujarati, Marathi), plus the Supabase client test. Gemini responses are schema-validated. If Gemini is unavailable, rate-limited, or malformed, the deterministic parser returns a valid `ClinicalIntake` instead of failing the patient flow.

## Deploy

1. Create a Supabase project and run the schema and migration above in the SQL Editor.
2. Deploy `backend/` to Render, Railway, or another Python host. Build command: `pip install -r requirements.txt`; start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; set all backend environment values.
3. Deploy `patient-app`, `doctor-dashboard`, and optionally `hospital-admin` as separate Vercel/Netlify static sites. Use `npm run build`, publish `dist`, and set each site’s `VITE_API_URL` at build time.
4. Set the three deployed site origins in backend `CORS_ORIGINS` (comma-separated, no trailing slash), then redeploy the backend.
5. Visit `https://your-backend-domain/health`; expected response is `{"status":"ok","service":"vaanidoc-backend"}`.

## Post-deployment smoke test

1. Register a doctor and confirm the dashboard displays a VAN code/QR link using the patient site URL.
2. Open the patient site on a phone, scan the QR or enter the code, join, and submit a short English or Indian-language symptom description.
3. Confirm the waiting state changes from processing to ready and the dashboard queue receives a structured intake.
4. Start and complete the consultation. Confirm it disappears from the queue; temporary input and intake rows must be removed by cascade.
5. Repeat with `GEMINI_API_KEY` empty to verify the fallback demo path.

## Demo flow (3 minutes)

Register/login as a doctor, show the permanent QR code, scan it with the patient app, dictate a Hindi/Gujarati/Marathi symptom, review and submit the transcript, open the prepared intake in the doctor queue, point out urgency and the medical disclaimer, then complete the consultation and explain the immediate data deletion.

## Known limitations

- Browser voice-to-text relies on the Web Speech API, best supported in current Chrome and Edge. Text entry remains available in all supported browsers.
- The fallback parser is deliberately conservative and keyword-based; Gemini improves language coverage and extraction quality when configured.
- Hospital administration is Phase 2 UI only; it must not be presented as a working roster/audit system.
- Deployment has not been performed from this workspace; use the smoke test after provisioning your own Supabase and hosting accounts.
