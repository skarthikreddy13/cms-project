"""
Security Module
===============
Handles password hashing and JWT tokens

Simple functions:
1. hash_password() - Hash a password
2. verify_password() - Check if password is correct  
3. create_token() - Create JWT token for user
4. decode_token() - Get email from JWT token
"""

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import HTTPException
import os

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plain text password
    
    Example:
        hashed = hash_password("mypassword123")
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain password matches the hashed password
    
    Example:
        is_valid = verify_password("mypassword123", hashed)
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_token(email: str) -> str:
    """
    Create a JWT token for a user
    Token expires in 30 minutes
    
    Example:
        token = create_token("user@example.com")
    """
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    
    data = {
        "sub": email,  # "sub" is standard JWT field for subject
        "exp": expire  # "exp" is standard JWT field for expiration
    }
    
    token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    return token


def decode_token(token: str) -> str:
    """
    Decode a JWT token and return the email
    Raises HTTPException if token is invalid or expired
    
    Example:
        email = decode_token("eyJ...")
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return email
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
