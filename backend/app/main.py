from fastapi import FastAPI

app = FastAPI(
    title="VaaniDoc API",
    description="Multilingual AI Health Intake System for Rural Clinics",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "vaanidoc-backend",
    }