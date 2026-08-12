from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin
from app.services.session_service import (
    create_session,
    delete_session,
    get_session,
    save_patient_input,
    update_session_status,
)

router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
)


class PatientInputRequest(BaseModel):
    text: str = Field(min_length=1)
    language: str = Field(min_length=2, max_length=10)


def get_doctor_id(user) -> str:
    """
    Resolve the authenticated Supabase user to the VaaniDoc doctor profile.
    """
    response = (
        supabase_admin
        .table("doctors")
        .select("id")
        .eq("auth_user_id", user.id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found.",
        )

    return response.data[0]["id"]


def require_session_owner(
    session_id: str,
    user,
) -> dict:
    """
    Return the session only if it belongs to the authenticated doctor.
    """
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    doctor_id = get_doctor_id(user)

    if session["doctor_id"] != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this session.",
        )

    return session


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_consultation_session(
    user=Depends(get_current_user),
):
    doctor_id = get_doctor_id(user)

    try:
        return create_session(doctor_id)

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create consultation session.",
        ) from exc


@router.get("/{session_id}")
async def get_consultation_session(
    session_id: str,
    user=Depends(get_current_user),
):
    return require_session_owner(
        session_id,
        user,
    )


@router.get("/{session_id}/status")
async def get_session_status(
    session_id: str,
    user=Depends(get_current_user),
):
    session = require_session_owner(
        session_id,
        user,
    )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


@router.post("/{session_id}/input")
async def submit_patient_input(
    session_id: str,
    request: PatientInputRequest,
    user=Depends(get_current_user),
):
    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is no longer active.",
        )

    try:
        saved_input = save_patient_input(
            session_id,
            {
                "type": "text",
                "text": request.text,
                "language": request.language,
            },
        )

        if saved_input is None:
            raise RuntimeError(
                "Failed to save patient input."
            )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save patient input.",
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session_id,
        "status": "received",
    }


@router.post("/{session_id}/start")
async def start_session(
    session_id: str,
    user=Depends(get_current_user),
):
    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is no longer active.",
        )

    try:
        updated_session = update_session_status(
            session_id,
            "active",
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to start consultation session.",
        ) from exc

    if updated_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": updated_session["status"],
    }


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    user=Depends(get_current_user),
):
    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        update_session_status(
            session_id,
            "completed",
        )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to complete consultation session.",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "completed",
        "data_deleted": True,
    }


@router.post("/{session_id}/cancel")
async def cancel_session(
    session_id: str,
    user=Depends(get_current_user),
):
    session = require_session_owner(
        session_id,
        user,
    )

    if session["status"] in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is already closed.",
        )

    try:
        update_session_status(
            session_id,
            "cancelled",
        )

        deleted = delete_session(
            session_id,
        )

    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to cancel consultation session.",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session could not be deleted.",
        )

    return {
        "session_id": session_id,
        "status": "cancelled",
        "data_deleted": True,
    }