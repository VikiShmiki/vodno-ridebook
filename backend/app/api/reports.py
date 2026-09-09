"""Motorcycle-relevant road condition reports."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import RoadReport
from app.schemas import ReportCategory, RoadReportCreate, RoadReportRead, RoadReportUpdate

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[RoadReportRead])
def list_reports(
    resolved: bool | None = Query(default=None),
    category: ReportCategory | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[RoadReport]:
    statement = select(RoadReport)
    if resolved is not None:
        statement = statement.where(RoadReport.resolved.is_(resolved))
    if category is not None:
        statement = statement.where(RoadReport.category == category.value)
    statement = statement.order_by(RoadReport.created_at.desc(), RoadReport.id.desc()).limit(limit)
    return list(db.scalars(statement))


@router.post("", response_model=RoadReportRead, status_code=status.HTTP_201_CREATED)
def create_report(payload: RoadReportCreate, db: Session = Depends(get_db)) -> RoadReport:
    report = RoadReport(**payload.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.patch("/{report_id}", response_model=RoadReportRead)
def update_report(
    report_id: int, payload: RoadReportUpdate, db: Session = Depends(get_db)
) -> RoadReport:
    report = db.get(RoadReport, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Report not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: Session = Depends(get_db)) -> None:
    report = db.get(RoadReport, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Report not found")
    db.delete(report)
    db.commit()
