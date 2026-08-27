from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta
import re

from backend.database.db import get_db
from backend.database.models import User, Book, Department, Upload, AdminLog, ConversationHistory
from backend.auth.auth_middleware import require_admin

router = APIRouter(prefix="/api/admin", tags=["analytics", "logs"])

def extract_book_title_from_query(raw_query: str) -> str:
    """
    Extracts and normalizes clean book titles from full conversational queries.
    E.g. 'i want this book ponniyin selvan' -> 'Ponniyin Selvan'
         'where is goodnight moon?' -> 'Goodnight Moon'
         'do you have the book alchemist available?' -> 'Alchemist'
    """
    if not raw_query:
        return ""
    q = raw_query.strip()
    
    # 1. Remove common conversational prefixes/intents
    prefix_patterns = [
        r'^(?:hey\s+sam|sam|hi|hello|please|kindly)[,\s]+',
        r'^(?:can\s+you|could\s+you|please)?\s*(?:find|search(?:\s+for)?|locate|show(?:\s+me)?|give(?:\s+me)?|tell(?:\s+me)?(?:\s+about)?|get(?:\s+me)?)\s+(?:the\s+)?(?:book\s+)?(?:called\s+|named\s+|titled\s+)?',
        r'^(?:i\s+want|i\s+need|i\s+am\s+looking\s+for|i\'m\s+looking\s+for|do\s+you\s+have|is\s+there|have\s+you\s+got)\s+(?:a\s+|an\s+|the\s+)?(?:copy\s+of\s+)?(?:book\s+|novel\s+)?(?:called\s+|named\s+|titled\s+)?(?:this\s+book\s+|that\s+book\s+)?',
        r'^(?:where\s+is|where\s+can\s+i\s+find|where\s+are)\s+(?:the\s+)?(?:book\s+)?(?:called\s+|named\s+)?',
        r'^(?:book\s+named|book\s+called|book\s+titled|book\s+on|novel\s+called)\s+',
        r'^(?:is\s+)?(?:the\s+)?(?:book\s+)?'
    ]
    
    changed = True
    while changed:
        old_q = q
        for pat in prefix_patterns:
            q = re.sub(pat, '', q, flags=re.IGNORECASE).strip()
        if q == old_q:
            changed = False
            
    # 2. Remove common conversational suffixes
    suffix_patterns = [
        r'\s+(?:available|in\s+stock|present|available\s+now|in\s+the\s+library|in\s+library|here)\??$',
        r'\s+(?:book|novel|copies|copy)\??$',
        r'\s+(?:please|kindly|sam)\??$',
        r'[?.!]+$'
    ]
    changed = True
    while changed:
        old_q = q
        for pat in suffix_patterns:
            q = re.sub(pat, '', q, flags=re.IGNORECASE).strip()
        if q == old_q:
            changed = False
            
    # Strip quotes and double spaces
    q = q.strip('"\' ')
    q = re.sub(r'\s+', ' ', q).strip()
    
    if q and len(q) >= 2:
        general_stops = {"how many books", "total books", "library hours", "rules", "who are you", "what is your name", "hello", "hi", "help"}
        if q.lower() in general_stops:
            return ""
        return q.title()
    return ""

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total_books = db.query(func.count(Book.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_departments = db.query(func.count(Department.id)).scalar() or 0
    
    today = datetime.utcnow().date()
    today_queries = db.query(func.count(ConversationHistory.id)).filter(func.date(ConversationHistory.created_at) == today).scalar() or 0
    
    total_uploads = db.query(func.count(Upload.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    
    # Missing Books Analysis (Unfound Queries)
    unanswered_logs = db.query(ConversationHistory).filter(
        or_(
            ConversationHistory.response.ilike("%could not find%"),
            ConversationHistory.response.ilike("%not found%"),
            ConversationHistory.response.ilike("%not in our%"),
            ConversationHistory.response.ilike("%no records found%")
        )
    ).order_by(ConversationHistory.created_at.desc()).limit(1000).all()
    
    missing_books = {}
    for log in unanswered_logs:
        clean_title = extract_book_title_from_query(log.query)
        if clean_title and len(clean_title) >= 2:
            missing_books[clean_title] = missing_books.get(clean_title, 0) + 1
            
    # Sort top missing books
    top_missing = sorted([{"title": k, "searches": v} for k, v in missing_books.items()], key=lambda x: x["searches"], reverse=True)[:15]
    
    # 7-day query trend
    trend_data = []
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        count = db.query(func.count(ConversationHistory.id)).filter(func.date(ConversationHistory.created_at) == target_date).scalar() or 0
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
