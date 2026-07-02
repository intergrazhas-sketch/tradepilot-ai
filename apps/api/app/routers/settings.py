from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _get_or_create(db: Session) -> models.PlatformSettings:
    settings_row = db.query(models.PlatformSettings).filter(models.PlatformSettings.id == "default").first()
    if not settings_row:
        settings_row = models.PlatformSettings(id="default")
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


@router.get("", response_model=schemas.SettingsOut)
def get_settings_endpoint(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("", response_model=schemas.SettingsOut)
def update_settings_endpoint(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    settings_row = _get_or_create(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings_row, field, value)
    db.commit()
    db.refresh(settings_row)
    return settings_row
