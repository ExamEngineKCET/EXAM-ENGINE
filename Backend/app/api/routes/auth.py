from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.user import User

router = APIRouter()

# --- VALIDATION SCHEMAS ---
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    institution: Optional[str] = ""
    category: Optional[str] = "GM"

class LoginResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    targetExam: str


# ---   THE GLOBAL AUTHENTICATION DEPENDENCY   ---
def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"), 
    db: Session = Depends(get_db)
):
    """
    Interceptors core module. Extracts the sender's dynamic user ID token from 
    incoming frontend request headers and verifies profile database legitimacy.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing mandatory session header [X-User-Id]."
        )
    
    try:
        user_id_int = int(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session identification format parsing failure."
        )

    user = db.query(User).filter(User.user_id == user_id_int).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active authorization record not found in system schema."
        )
        
    return user


# --- 1. ACCOUNT ACCESS ENDPOINT ---
@router.post("/login", response_model=LoginResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip()).first()
    
    if not user or str(user.password_hash) != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    return {
        "id": str(user.user_id),
        "name": user.name,
        "email": user.email,
        "role": "student", 
        "targetExam": "KCET 2026" 
    }


# --- 2. ACCOUNT CREATION ENDPOINT ---
@router.post("/register", response_model=LoginResponse)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email.strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account using this email address is already registered."
        )
    
    new_user = User(
        name=payload.name.strip(),
        email=payload.email.strip(),
        password_hash=str(payload.password)
    )
    
    if hasattr(new_user, 'institution'):
        setattr(new_user, 'institution', payload.institution)
    if hasattr(new_user, 'category'):
        setattr(new_user, 'category', payload.category)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": str(new_user.user_id),
        "name": new_user.name,
        "email": new_user.email,
        "role": "student",
        "targetExam": "KCET 2026"
    }