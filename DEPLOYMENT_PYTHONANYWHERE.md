# Deploying Flask App on PythonAnywhere

This project now uses a Flask backend with SQLite persistence and session-based authentication.

## 1) Upload project and create virtualenv

In a PythonAnywhere Bash console:

```bash
cd ~
git clone <your-repo-url> traffic
cd traffic/Kigali_Traffic_App
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Create Web App

1. Open **Web** tab in PythonAnywhere.
2. Click **Add a new web app**.
3. Choose **Manual configuration** and your Python version.
4. Set **Source code** path to your project folder:
   - `/home/<your-username>/traffic/Kigali_Traffic_App`
5. Set **Working directory** to the same folder.
6. Set **Virtualenv** to:
   - `/home/<your-username>/traffic/Kigali_Traffic_App/.venv`

## 3) Configure WSGI file

Edit the PythonAnywhere WSGI configuration file and set:

```python
import sys
from pathlib import Path

project_path = Path('/home/<your-username>/traffic/Kigali_Traffic_App')
if str(project_path) not in sys.path:
    sys.path.insert(0, str(project_path))

from backend.app import app as application
```

## 4) Environment variables

In **Web > Environment variables**, add:

- `SECRET_KEY` = a long random value
- `SESSION_COOKIE_SECURE` = `true` (when using HTTPS)
- `DATABASE_URL` = optional. Default is SQLite file `traffic.db` in project root.
- `ADMIN_EMAIL` = desired initial admin email
- `ADMIN_PASSWORD` = desired initial admin password

## 5) Initialize database and admin

From Bash console:

```bash
cd ~/traffic/Kigali_Traffic_App
source .venv/bin/activate
flask --app backend.app create-admin
```

This creates `traffic.db` (if missing) and ensures an admin account exists.

## 6) Reload web app

Click **Reload** in the PythonAnywhere Web tab.

## 7) Verify

- Open your PythonAnywhere URL.
- Sign up a normal user and log in.
- Log in as admin and verify issue status update/delete.
- Restart browser and confirm data persists.
