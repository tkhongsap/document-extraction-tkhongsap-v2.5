"""
Email Verification System
"""
import secrets
import aiosmtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Column, String, DateTime, Boolean

from app.core.database import Base
from .base import generate_uuid


class EmailVerification(Base):
    """Email verification tokens table"""
    __tablename__ = "email_verifications"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, nullable=False)
    token = Column(String, nullable=False, unique=True)
    user_id = Column(String, nullable=True)  # Optional - for new registrations
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def generate_verification_token() -> str:
    """Generate a secure verification token"""
    return secrets.token_urlsafe(32)


async def create_verification_token(
    db: AsyncSession, 
    email: str, 
    user_id: Optional[str] = None,
    expires_in_hours: int = 24
) -> EmailVerification:
    """Create a new email verification token"""
    from app.services.storage import StorageService
    
    token = generate_verification_token()
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
    
    verification = EmailVerification(
        email=email,
        token=token,
        user_id=user_id,
        expires_at=expires_at
    )
    
    db.add(verification)
    await db.commit()
    await db.refresh(verification)
    
    return verification


async def verify_email_token(db: AsyncSession, token: str) -> Optional[EmailVerification]:
    """Verify and mark an email verification token as used"""
    from sqlalchemy import select
    
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.token == token,
            EmailVerification.verified == False,
            EmailVerification.expires_at > datetime.utcnow()
        )
    )
    verification = result.scalar_one_or_none()
    
    if verification:
        verification.verified = True
        await db.commit()
    
    return verification


async def send_verification_email_async(email: str, token: str, frontend_url: str = "http://localhost:5000"):
    """Send verification email asynchronously using SMTP"""
    from app.core.config import get_settings
    
    settings = get_settings()
    verification_url = f"{frontend_url}/verify-email?token={token}"
    
    # Skip email sending if SMTP not configured
    if not settings.smtp_username or not settings.smtp_password or not settings.from_email:
        print(f"[EMAIL] SMTP not configured - verification email for {email}")
        print(f"[EMAIL] Verification URL: {verification_url}")
        return True
    
    subject = "Verify your email - Document AI Extractor"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h1 style="color: #2563eb; text-align: center;">Email Verification</h1>
            
            <p>Hello,</p>
            
            <p>Thank you for registering with Document AI Extractor! Please click the button below to verify your email address:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}" 
                   style="background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">{verification_url}</p>
            
            <p style="color: #6b7280; font-size: 14px;">
                This link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
                This email was sent from Document AI Extractor.<br>
                If you didn't request this email, please ignore it.
            </p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Email Verification - Document AI Extractor
    
    Hello,
    
    Thank you for registering with Document AI Extractor! Please copy and paste the link below into your browser to verify your email address:
    
    {verification_url}
    
    This link will expire in 24 hours. If you didn't create an account, please ignore this email.
    
    Best regards,
    Document AI Extractor Team
    """
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{settings.from_name} <{settings.from_email}>"
        msg['To'] = email
        
        # Attach text and HTML versions
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email using aiosmtplib
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_server,
            port=settings.smtp_port,
            start_tls=settings.smtp_use_tls,
            username=settings.smtp_username,
            password=settings.smtp_password,
        )
        
        print(f"[EMAIL] Successfully sent verification email to: {email}")
        return True
        
    except Exception as e:
        print(f"[EMAIL] Failed to send verification email to {email}: {str(e)}")
        print(f"[EMAIL] Fallback - Verification URL: {verification_url}")
        return False