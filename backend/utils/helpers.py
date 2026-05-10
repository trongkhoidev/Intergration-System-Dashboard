import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import get_auth_connection

def log_audit(action, username="system", details=""):
    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        cur.execute(
            "INSERT INTO AuditLogs (Username, Action, Details, Timestamp) VALUES (?, ?, ?, GETDATE())",
            (username, action, details),
        )
        cur.close()
        auth.close()
    except Exception as e:
        print(f"Audit log error: {e}")

def normalize_gender(g):
    if not g: return "Male"
    g_low = str(g).lower().strip()
    if g_low in ["nam", "male"]: return "Male"
    if g_low in ["nữ", "nu", "female"]: return "Female"
    return "Other"

def generate_otp():
    """Tạo mã OTP ngẫu nhiên 6 chữ số."""
    return str(random.randint(100000, 999999))

def send_otp_email(to_email, otp_code, username):
    """
    Gửi mã OTP qua email.
    """
    mail_server = os.environ.get('MAIL_SERVER', '')
    mail_user = os.environ.get('MAIL_USERNAME', '')
    mail_pass = os.environ.get('MAIL_PASSWORD', '')
    mail_port = int(os.environ.get('MAIL_PORT', '587'))

    if not mail_server or not mail_user or not mail_pass:
        print(f"\n{'='*50}")
        print(f"  [OTP MOCK] Email: {to_email}")
        print(f"  [OTP MOCK] Ma OTP: {otp_code}")
        print(f"  [OTP MOCK] Het han sau 10 phut")
        print(f"{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'[Integration Dashboard] Ma OTP xac nhan: {otp_code}'
        msg['From'] = mail_user
        msg['To'] = to_email

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; background: #f8f9fa; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); width: 56px; height: 56px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 24px;">🔐</span>
                </div>
            </div>
            <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">Xac nhan doi mat khau</h2>
            <p style="text-align: center; color: #6b7280; font-size: 14px;">Xin chao <b>{username}</b>, day la ma OTP cua ban:</p>
            <div style="background: white; border: 2px dashed #4f46e5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">{otp_code}</span>
            </div>
            <p style="text-align: center; color: #ef4444; font-size: 13px; font-weight: bold;">⏳ Ma nay se het han sau 10 phut</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="text-align: center; color: #9ca3af; font-size: 12px;">Neu ban khong yeu cau doi mat khau, vui long bo qua email nay.</p>
        </div>
        """
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(mail_server, mail_port) as server:
            server.starttls()
            server.login(mail_user, mail_pass)
            server.sendmail(mail_user, to_email, msg.as_string())

        print(f"[EMAIL] OTP sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {e}")
        return False
