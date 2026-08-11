from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr


router = APIRouter(
    prefix="/auth/doctor",
    tags=["Doctor Authentication"],
)


class DoctorRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class DoctorLoginRequest(BaseModel):
    email: EmailStr
    password: str


class DoctorAuthResponse(BaseModel):
    message: str
    doctor_id: str | None = None
    doctor_code: str | None = None
    access_token: str | None = None


@router.post(
    "/register",
    response_model=DoctorAuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_doctor(request: DoctorRegisterRequest):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Doctor registration storage is not implemented yet.",
    )


@router.post(
    "/login",
    response_model=DoctorAuthResponse,
)
async def login_doctor(request: DoctorLoginRequest):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Doctor authentication is not implemented yet.",
    )