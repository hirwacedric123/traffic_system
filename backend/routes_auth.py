from functools import wraps
import re
import time

from flask import Blueprint, jsonify, request, session
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from .models import Issue, User, db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
LOGIN_WINDOW_SECONDS = 10 * 60
LOGIN_MAX_ATTEMPTS = 5
_login_attempts = {}


def _email_from_payload(payload):
    return (payload.get("email") or "").strip().lower()


def _validate_email(email):
    if not email:
        return "Email is required."
    if len(email) > 255:
        return "Email is too long."
    if not EMAIL_RE.fullmatch(email):
        return "Please provide a valid email address."
    return None


def _validate_password(password):
    if not password:
        return "Password is required."
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Password must be at least {PASSWORD_MIN_LENGTH} characters long."
    if len(password) > PASSWORD_MAX_LENGTH:
        return f"Password must be at most {PASSWORD_MAX_LENGTH} characters long."
    return None


def _login_key():
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    ip_addr = forwarded or request.remote_addr or "unknown-ip"
    payload = request.get_json(silent=True) or {}
    email = _email_from_payload(payload)
    return f"{ip_addr}:{email}"


def _is_login_rate_limited():
    key = _login_key()
    now = time.time()
    attempts = _login_attempts.get(key, [])
    attempts = [ts for ts in attempts if now - ts <= LOGIN_WINDOW_SECONDS]
    _login_attempts[key] = attempts
    return len(attempts) >= LOGIN_MAX_ATTEMPTS


def _record_failed_login_attempt():
    key = _login_key()
    now = time.time()
    attempts = _login_attempts.get(key, [])
    attempts = [ts for ts in attempts if now - ts <= LOGIN_WINDOW_SECONDS]
    attempts.append(now)
    _login_attempts[key] = attempts


def _clear_login_attempts():
    key = _login_key()
    _login_attempts.pop(key, None)


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Authentication required."}), 401

        user = User.query.get(user_id)
        if not user:
            session.clear()
            return jsonify({"error": "Authentication required."}), 401
        return view_func(*args, **kwargs)

    return wrapper


def admin_required(view_func):
    @wraps(view_func)
    @login_required
    def wrapper(*args, **kwargs):
        if session.get("role") != "admin":
            return jsonify({"error": "Admin privileges required."}), 403
        return view_func(*args, **kwargs)

    return wrapper


@auth_bp.post("/signup")
def signup():
    payload = request.get_json(silent=True) or {}
    email = _email_from_payload(payload)
    password = payload.get("password") or ""

    email_error = _validate_email(email)
    if email_error:
        return jsonify({"error": email_error}), 400

    password_error = _validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists. Please log in."}), 409

    user = User(email=email, password_hash=generate_password_hash(password), role="user")
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Account created successfully."}), 201


@auth_bp.post("/login")
def login():
    if _is_login_rate_limited():
        return jsonify({"error": "Too many failed login attempts. Please try again later."}), 429

    payload = request.get_json(silent=True) or {}
    email = _email_from_payload(payload)
    password = payload.get("password") or ""

    if _validate_email(email) or not password:
        return jsonify({"error": "Please provide email and password."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        _record_failed_login_attempt()
        return jsonify({"error": "Invalid email or password."}), 401

    _clear_login_attempts()
    session.clear()
    session.permanent = True
    session["user_id"] = user.id
    session["role"] = user.role
    return jsonify({"message": "Login successful.", "user": {"email": user.email, "role": user.role}}), 200


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.get("/me")
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False}), 401

    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({"authenticated": False}), 401

    return jsonify({"authenticated": True, "user": {"email": user.email, "role": user.role}}), 200


@auth_bp.get("/users")
@admin_required
def list_users():
    users_with_issue_count = (
        db.session.query(User, func.count(Issue.id).label("issues_count"))
        .outerjoin(Issue, Issue.reporter_user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .all()
    )

    users = [
        {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat(),
            "issues_count": issues_count,
        }
        for user, issues_count in users_with_issue_count
    ]
    return jsonify(users), 200
