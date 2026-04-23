"""
JWT Utilities – Token creation and verification for the Integration Dashboard.
Uses PyJWT for stateless authentication as required by SRS & API Plan.
"""
import jwt
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify

# Secret key for signing tokens – in production, use a secure env variable
JWT_SECRET = os.environ.get("JWT_SECRET", "integration-dashboard-secret-2025")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 8  # Token validity period


def normalize_role(raw_role):
    role = (raw_role or "").strip().lower()
    if role in ["admin", "administrator", "system administrator"]:
        return "Admin"
    if role in ["hr", "hr manager", "human resources", "human resource manager"]:
        return "HR"
    if role in ["payroll", "payroll manager", "finance payroll"]:
        return "Payroll"
    if role in ["employee", "user", "staff"]:
        return "Employee"
    return "Employee"


def create_token(user_id, username, email, role):
    """Generate a JWT token with user claims."""
    payload = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "role": normalize_role(role),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token):
    """Decode and verify a JWT token. Returns payload dict or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(allowed_roles=None):
    """
    Flask decorator to protect API endpoints.
    Usage: @require_auth(allowed_roles=['Admin', 'HR'])
    If allowed_roles is None, any authenticated user can access.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")

            if not auth_header.startswith("Bearer "):
                return jsonify({"status": "error", "msg": "Missing or invalid token"}), 401

            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)

            if payload is None:
                return jsonify({"status": "error", "msg": "Token expired or invalid"}), 401

            # Check role-based access
            if allowed_roles:
                user_role = normalize_role(payload.get("role", ""))
                allowed_normalized = [normalize_role(r) for r in allowed_roles]
                if user_role not in allowed_normalized:
                    return jsonify({"status": "error", "msg": "Access denied – insufficient permissions"}), 403

            # Attach user info to request for downstream use
            payload["role"] = normalize_role(payload.get("role", ""))
            request.current_user = payload
            return f(*args, **kwargs)

        return decorated_function
    return decorator
