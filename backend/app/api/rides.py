"""Ride log endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Motorcycle, Ride
from app.schemas import RideCreate, RideRead

router = APIRouter(prefix="/rides", tags=["rides"])


@router.get("", response_model=list[RideRead])
def list_rides(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Ride]:
    statement = (
        select(Ride)
        .options(selectinload(Ride.motorcycle))
        .order_by(Ride.date.desc(), Ride.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement))


@router.post("", response_model=RideRead, status_code=status.HTTP_201_CREATED)
def create_ride(payload: RideCreate, db: Session = Depends(get_db)) -> Ride:
    if payload.motorcycle_id is not None and db.get(Motorcycle, payload.motorcycle_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown motorcycle_id")

    ride = Ride(**payload.model_dump())
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return ride


@router.get("/{ride_id}", response_model=RideRead)
def get_ride(ride_id: int, db: Session = Depends(get_db)) -> Ride:
    ride = db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ride not found")
    return ride


@router.delete("/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ride(ride_id: int, db: Session = Depends(get_db)) -> None:
    ride = db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ride not found")
    db.delete(ride)
    db.commit()
