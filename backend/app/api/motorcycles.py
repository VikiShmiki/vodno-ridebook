"""Motorcycle garage endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Motorcycle
from app.schemas import MotorcycleCreate, MotorcycleRead

router = APIRouter(prefix="/motorcycles", tags=["motorcycles"])


@router.get("", response_model=list[MotorcycleRead])
def list_motorcycles(db: Session = Depends(get_db)) -> list[Motorcycle]:
    return list(db.scalars(select(Motorcycle).order_by(Motorcycle.id)))


@router.post("", response_model=MotorcycleRead, status_code=status.HTTP_201_CREATED)
def create_motorcycle(payload: MotorcycleCreate, db: Session = Depends(get_db)) -> Motorcycle:
    motorcycle = Motorcycle(**payload.model_dump())
    db.add(motorcycle)
    db.commit()
    db.refresh(motorcycle)
    return motorcycle


@router.delete("/{motorcycle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_motorcycle(motorcycle_id: int, db: Session = Depends(get_db)) -> None:
    motorcycle = db.get(Motorcycle, motorcycle_id)
    if motorcycle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Motorcycle not found")
    db.delete(motorcycle)
    db.commit()
