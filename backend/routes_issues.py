from functools import wraps

from flask import Blueprint, jsonify, request, session

from .models import Issue, User, db

issues_bp = Blueprint("issues", __name__, url_prefix="/api/issues")


def _serialize_issue(issue):
    return {
        "id": str(issue.id),
        "type": issue.type,
        "description": issue.description,
        "location": {
            "address": issue.address,
            "coordinates": {"lat": issue.lat, "lng": issue.lng},
        },
        "image": issue.image_base64,
        "timestamp": issue.created_at.isoformat(),
        "status": issue.status,
        "reporter": issue.reporter.email if issue.reporter else "unknown",
    }


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


@issues_bp.get("")
def get_issues():
    issues = Issue.query.order_by(Issue.created_at.desc()).all()
    return jsonify([_serialize_issue(issue) for issue in issues]), 200


@issues_bp.post("")
@login_required
def create_issue():
    payload = request.get_json(silent=True) or {}
    issue_type = payload.get("type")
    description = (payload.get("description") or "").strip()
    location = payload.get("location") or {}
    address = (location.get("address") or "").strip()
    coordinates = location.get("coordinates") or {}
    lat = coordinates.get("lat")
    lng = coordinates.get("lng")
    image_data = payload.get("image")

    if not issue_type or not description or not address:
        return jsonify({"error": "Type, description, and location are required."}), 400
    if lat is None or lng is None:
        return jsonify({"error": "Location coordinates are required."}), 400

    issue = Issue(
        type=issue_type,
        description=description,
        address=address,
        lat=float(lat),
        lng=float(lng),
        image_base64=image_data,
        status="pending",
        reporter_user_id=session["user_id"],
    )
    db.session.add(issue)
    db.session.commit()
    return jsonify(_serialize_issue(issue)), 201


@issues_bp.patch("/<int:issue_id>/status")
@admin_required
def update_issue_status(issue_id):
    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")
    if new_status not in {"pending", "solved"}:
        return jsonify({"error": "Status must be 'pending' or 'solved'."}), 400

    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found."}), 404

    issue.status = new_status
    db.session.commit()
    return jsonify(_serialize_issue(issue)), 200


@issues_bp.delete("/<int:issue_id>")
@admin_required
def delete_issue(issue_id):
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({"error": "Issue not found."}), 404

    db.session.delete(issue)
    db.session.commit()
    return jsonify({"message": "Issue deleted successfully."}), 200
