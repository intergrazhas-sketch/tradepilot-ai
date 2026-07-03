from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from app.services.launch_control import build_launch_issues, build_launch_metrics

router = APIRouter(prefix="/api/v1/launch-control", tags=["launch-control"])


@router.get("/summary", response_model=schemas.LaunchControlSummary)
def launch_control_summary(db: Session = Depends(get_db)):
    data = build_launch_metrics(db)
    return schemas.LaunchControlSummary(
        suppliers_count=data["suppliers_count"],
        products_count=data["products_count"],
        good_products_count=data["good_products_count"],
        ready_listings_count=data["ready_listings_count"],
        test_candidates_count=data["test_candidates_count"],
        selected_for_test_count=data["selected_for_test_count"],
        active_orders_count=data["active_orders_count"],
        total_expected_profit=data["total_expected_profit"],
        average_margin_percent=data["average_margin_percent"],
        checklist=[schemas.LaunchControlChecklistItem(**item) for item in data["checklist"]],
        checklist_done=data["checklist_done"],
        checklist_warning=data["checklist_warning"],
        checklist_missing=data["checklist_missing"],
    )


@router.get("/issues", response_model=list[schemas.LaunchControlIssue])
def launch_control_issues(db: Session = Depends(get_db)):
    return [schemas.LaunchControlIssue(**item) for item in build_launch_issues(db)]
