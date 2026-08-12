from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.doctors import router as doctors_router
from app.api.processing import router as processing_router
from app.api.sessions import router as sessions_router


app = FastAPI(
    title="VaaniDoc API",
    description="Multilingual AI Health Intake System for Rural Clinics",
    version="0.4.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

app.include_router(auth_router)
app.include_router(doctors_router)
app.include_router(sessions_router)
app.include_router(processing_router)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "vaanidoc-backend",
    }