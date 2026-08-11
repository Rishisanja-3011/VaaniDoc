from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

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


class CreateSessionRequest(BaseModel):
    doctor_id: str = Field(min_length=1)


class PatientInputRequest(BaseModel):
    text: str = Field(min_length=1)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_consultation_session(request: CreateSessionRequest):
    return create_session(request.doctor_id)


@router.get("/{session_id}")
async def get_consultation_session(session_id: str):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return session


@router.get("/{session_id}/status")
async def get_session_status(session_id: str):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


@router.post("/{session_id}/input")
async def submit_patient_input(
    session_id: str,
    request: PatientInputRequest,
):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if session["status"] in {"completed", "cancelled"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session is no longer active.",
        )

    save_patient_input(
        session_id,
        {
            "type": "text",
            "text": request.text,
        },
    )

    return {
        "session_id": session_id,
        "status": "received",
    }


@router.post("/{session_id}/start")
async def start_session(session_id: str):
    session = update_session_status(session_id, "active")

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    return {
        "session_id": session_id,
        "status": session["status"],
    }


@router.post("/{session_id}/complete")
async def complete_session(session_id: str):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    update_session_status(session_id, "completed")

    # Privacy requirement:
    # patient/session data must not remain after completion.
    delete_session(session_id)

    return {
        "session_id": session_id,
        "status": "completed",
        "data_deleted": True,
    }


@router.post("/{session_id}/cancel")
async def cancel_session(session_id: str):
    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    update_session_status(session_id, "cancelled")

    # Cancelled sessions are also cleaned up.
    delete_session(session_id)

    return {
        "session_id": session_id,
        "status": "cancelled",
        "data_deleted": True,
    }