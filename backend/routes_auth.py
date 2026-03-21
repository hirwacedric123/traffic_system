from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from .models import User, db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _email_from_payload(payload):
    return (payload.get("email") or "").strip().lower()


@auth_bp.post("/signup")
def signup():
    payload = request.get_json(silent=True) or {}
    email = _email_from_payload(payload)
    password = payload.get("password") or ""

    if not email:
        return jsonify({"error": "Email is required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already exists. Please log in."}), 409

    user = User(email=email, password_hash=generate_password_hash(password), role="user")
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Account created successfully."}), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = _email_from_payload(payload)
    password = payload.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Please provide email and password."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    session.clear()
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
