from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import re

from backend.database.db import get_db
from backend.database.models import User, Book, Department, Upload, AdminLog, ConversationHistory
from backend.auth.auth_middleware import require_admin

router = APIRouter(prefix="/api/admin", tags=["analytics", "logs"])

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total_books = db.query(func.count(Book.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_departments = db.query(func.count(Department.id)).scalar()
    
    today = datetime.utcnow().date()
    today_queries = db.query(func.count(ConversationHistory.id)).filter(func.date(ConversationHistory.created_at) == today).scalar()
    
    total_uploads = db.query(func.count(Upload.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    
    # Missing Books Analysis
    # We look through ConversationHistory for responses containing "I could not find"
    unanswered_logs = db.query(ConversationHistory).filter(ConversationHistory.response.ilike("%could not find%")).limit(500).all()
    
    missing_books = {}
    for log in unanswered_logs:
        query = log.query.lower().replace("where is", "").replace("do you have", "").replace("find", "").strip()
        if query and len(query) > 3:
            missing_books[query] = missing_books.get(query, 0) + 1
            
    # Sort top missing books
    top_missing = sorted([{"title": k, "searches": v} for k, v in missing_books.items()], key=lambda x: x["searches"], reverse=True)[:10]
    
    # 7-day query trend
    trend_data = []
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        count = db.query(func.count(ConversationHistory.id)).filter(func.date(ConversationHistory.created_at) == target_date).scalar()
        trend_data.append({"date": target_date.strftime("%b %d"), "queries": count})
    
    # Recent activity
    recent_logs = db.query(AdminLog).order_by(AdminLog.created_at.desc()).limit(10).all()
    recent_activity = []
    for log in recent_logs:
        admin_user = db.query(User).filter(User.id == log.admin_id).first()
        recent_activity.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "admin_name": admin_user.username if admin_user else "Unknown",
            "created_at": log.created_at
        })
    
    return {
        "total_books": total_books,
        "total_users": total_users,
        "total_departments": total_departments,
        "today_queries": today_queries,
        "total_uploads": total_uploads,
        "active_users": active_users,
        "recent_activity": recent_activity,
        "top_missing_books": top_missing,
        "trend_data": trend_data
    }

@router.get("/logs")
def get_admin_logs(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(AdminLog).order_by(AdminLog.created_at.desc()).limit(100).all()

@router.get("/chat-logs")
def get_chat_logs(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    logs = db.query(ConversationHistory).order_by(ConversationHistory.created_at.desc()).limit(100).all()
    return logs
