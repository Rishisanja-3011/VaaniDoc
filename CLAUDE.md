# VaaniDoc Engineering Rules

## Product

VaaniDoc is a voice-first patient-doctor consultation platform.

The patient identifies a doctor using a permanent doctor QR/code,
joins a consultation session, submits text or voice symptoms,
and the doctor receives an AI-assisted structured consultation.

## Architecture

Patient QR/code identifies the DOCTOR.

A new SESSION identifies each consultation.

Never create a new QR code for every consultation.

Patient:
QR/code → doctor lookup → session → text/voice → AI processing

Doctor:
login → dashboard → patient queue → consultation → AI assistance → completion

## Patient privacy

- Do not create unnecessary patient accounts.
- Do not persist patient medical data in localStorage.
- Do not expose patient data in URLs.
- Do not log sensitive patient content.
- Keep offline queue memory-only.
- Do not expose secrets in frontend code.

## AI

AI assists the doctor.

AI must NOT diagnose the patient.

AI output should contain:
- summary
- symptoms
- duration
- relevant context
- red flags / concerns
- suggested questions

AI output must be structured JSON.

## Development

- Preserve existing working functionality.
- Do not delete tests to make them pass.
- Do not rewrite the architecture without approval.
- Prefer small changes.
- Run tests after significant changes.
- Keep mock mode available.
- Keep AI behind an AI service abstraction.
- Use environment variables for secrets.

## Definition of done

A feature is not complete until:
1. implementation exists
2. tests pass
3. build passes
4. integration is verified
5. user-facing errors are handled