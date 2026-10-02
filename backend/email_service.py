import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()  # also load root .env if present

logger = logging.getLogger("pluto_email_service")

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "dheerajsuner6@gmail.com")
SENDER_NAME = os.getenv("SENDER_NAME", "PLUTO Job Finder")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")  # App Password for Gmail


def is_smtp_configured() -> bool:
    """Check if SMTP credentials are provided."""
    return bool(SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """Send an email using SMTP (TLS)."""
    smtp_pwd = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    if not smtp_pwd:
        logger.warning(
            f"[EMAIL MOCK/LOG] SMTP_PASSWORD is not set in environment. Email to '{to_email}' was not sent via network.\n"
            f"Subject: {subject}\n"
            f"To configure live sending, set SENDER_EMAIL={SENDER_EMAIL} and SMTP_PASSWORD=<your-gmail-app-password> in .env"
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        if html_content:
            msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SENDER_EMAIL, smtp_pwd)
            server.sendmail(SENDER_EMAIL, [to_email], msg.as_string())

        logger.info(f"Successfully sent email '{subject}' to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_welcome_email(user_email: str, user_name: str, app_url: str = "") -> bool:
    """Send a modern welcome email to newly registered users."""
    display_name = user_name.strip() or "Job Seeker"
    subject = "Welcome to PLUTO — Your Career & ATS Companion! 🚀"
    base_url = app_url or os.getenv("APP_URL", "http://localhost:8000")
    upload_url = f"{base_url.rstrip('/')}/upload-resume.html"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 20px auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }}
        .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef); padding: 32px 24px; text-align: center; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }}
        .header p {{ color: #e2e8f0; margin: 8px 0 0 0; font-size: 15px; }}
        .body-content {{ padding: 32px 28px; color: #cbd5e1; line-height: 1.6; font-size: 15px; }}
        .greeting {{ font-size: 18px; color: #ffffff; font-weight: 600; margin-bottom: 16px; }}
        .feature-card {{ background: #0f172a; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #6366f1; }}
        .feature-title {{ color: #818cf8; font-weight: 600; margin-bottom: 4px; }}
        .cta-button {{ display: inline-block; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 24px; text-align: center; }}
        .cta-button:hover {{ background: #4f46e5; }}
        .footer {{ padding: 20px; background: #0f172a; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #334155; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PLUTO</h1>
          <p>AI-Powered Job Finder & ATS Resume Analyzer</p>
        </div>
        <div class="body-content">
          <div class="greeting">Welcome aboard, {display_name}! 👋</div>
          <p>Thank you for registering with <strong>PLUTO</strong>. We're thrilled to have you here to accelerate your career and match you with top job opportunities.</p>
          
          <div class="feature-card">
            <div class="feature-title">📄 ATS Resume Scoring</div>
            Get instant AI analysis of your resume and discover optimization tips to pass ATS screeners.
          </div>
          
          <div class="feature-card">
            <div class="feature-title">🎯 Tailored Job Matching</div>
            Discover live job listings matched precisely to your extracted skills and experience.
          </div>

          <p>Get started today by uploading your resume or exploring open jobs!</p>
          
          <div style="text-align: center;">
            <a href="{upload_url}" class="cta-button">Upload Your Resume Now</a>
          </div>
        </div>
        <div class="footer">
          <p>Sent with ❤️ by PLUTO Job Finder ({SENDER_EMAIL})</p>
          <p>If you didn't create an account with us, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""
Welcome to PLUTO, {display_name}!

Thank you for registering with PLUTO — AI-Powered Job Finder & ATS Resume Analyzer.

Features available to you:
- ATS Resume Scoring: Instant AI feedback on your resume.
- Tailored Job Matches: Discover live job opportunities based on your skills.

Get started: {upload_url}

Best regards,
PLUTO Team ({SENDER_EMAIL})
"""

    return send_email(user_email, subject, html_content, text_content)


def send_password_reset_email(user_email: str, reset_link: str, user_name: str = "User") -> bool:
    """Send a password reset email with reset link."""
    display_name = user_name.strip() or "User"
    subject = "Reset Your PLUTO Password 🔒"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 20px auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }}
        .header {{ background: linear-gradient(135deg, #ef4444, #f97316); padding: 28px 24px; text-align: center; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; }}
        .body-content {{ padding: 32px 28px; color: #cbd5e1; line-height: 1.6; font-size: 15px; }}
        .greeting {{ font-size: 18px; color: #ffffff; font-weight: 600; margin-bottom: 16px; }}
        .cta-button {{ display: inline-block; background: #ef4444; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px; text-align: center; }}
        .link-box {{ background: #0f172a; padding: 12px; border-radius: 6px; font-family: monospace; word-break: break-all; color: #94a3b8; font-size: 13px; margin-top: 16px; }}
        .footer {{ padding: 20px; background: #0f172a; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #334155; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="body-content">
          <div class="greeting">Hello {display_name},</div>
          <p>We received a request to reset your password for your <strong>PLUTO</strong> account ({user_email}).</p>
          <p>Click the button below to set a new password for your account:</p>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="{reset_link}" class="cta-button">Reset Password</a>
          </div>

          <p>Or copy and paste this URL into your browser:</p>
          <div class="link-box">{reset_link}</div>

          <p style="margin-top: 24px; color: #94a3b8; font-size: 14px;">If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>Sent by PLUTO Job Finder ({SENDER_EMAIL})</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""
Password Reset Request

Hello {display_name},

We received a request to reset your password for your PLUTO account ({user_email}).

Reset your password using the link below:
{reset_link}

If you did not request this, please ignore this email.

PLUTO Team ({SENDER_EMAIL})
"""

    return send_email(user_email, subject, html_content, text_content)
