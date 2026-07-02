from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/channels", tags=["channels"])


@router.get("", response_model=list[schemas.ChannelOut])
def list_channels(db: Session = Depends(get_db)):
    return db.query(models.MarketplaceChannel).all()


@router.post("", response_model=schemas.ChannelOut, status_code=201)
def create_channel(payload: schemas.ChannelCreate, db: Session = Depends(get_db)):
    channel = models.MarketplaceChannel(**payload.model_dump())
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel


@router.put("/{channel_id}", response_model=schemas.ChannelOut)
def update_channel(channel_id: str, payload: schemas.ChannelUpdate, db: Session = Depends(get_db)):
    channel = db.query(models.MarketplaceChannel).filter(models.MarketplaceChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(channel, field, value)
    db.commit()
    db.refresh(channel)
    return channel
