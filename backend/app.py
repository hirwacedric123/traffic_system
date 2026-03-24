import os
from pathlib import Path
from datetime import timedelta

from flask import Flask, jsonify, send_from_directory

from .models import User, db
from .routes_auth import auth_bp
from .routes_issues import issues_bp


def create_app():
    project_root = Path(__file__).resolve().parent.parent
    static_dir = str(project_root)

    app = Flask(__name__, static_folder=static_dir, static_url_path="")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-only-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", f"sqlite:///{project_root / 'traffic.db'}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=12)

    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(issues_bp)

    with app.app_context():
        db.create_all()

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.get("/")
    def root():
        return send_from_directory(static_dir, "auth.html")

    @app.get("/<path:path>")
    def static_files(path):
        file_path = project_root / path
        if file_path.is_file():
            return send_from_directory(static_dir, path)
        return send_from_directory(static_dir, "auth.html")

    @app.cli.command("create-admin")
    def create_admin():
        from werkzeug.security import generate_password_hash

        email = os.getenv("ADMIN_EMAIL", "admin@kigali.com").strip().lower()
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        existing = User.query.filter_by(email=email).first()
        if existing:
            existing.role = "admin"
            existing.password_hash = generate_password_hash(password)
        else:
            db.session.add(
                User(email=email, password_hash=generate_password_hash(password), role="admin")
            )
        db.session.commit()
        print(f"Admin user ready: {email}")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
