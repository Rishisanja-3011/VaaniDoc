from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"],
)


class DoctorProfileResponse(BaseModel):
    doctor_id: str
    name: str
    email: str
    doctor_code: str


class DoctorJoinResponse(BaseModel):
    doctor_id: str
    doctor_name: str
    doctor_code: str
    available: bool


@router.get("/me")
async def get_current_doctor():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Doctor authentication dependency is not implemented yet.",
    )


@router.get("/{doctor_code}/join")
async def get_doctor_for_join(doctor_code: str):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Doctor lookup is not implemented yet.",
    )