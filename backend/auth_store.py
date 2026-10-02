import json
import os
import secrets
import time
from typing import Dict, Optional

USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users_db.json")
TOKENS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reset_tokens.json")


def _load_json(filepath: str) -> dict:
    if not os.path.exists(filepath):
        return {}
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_json(filepath: str, data: dict):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving {filepath}: {e}")


def get_user_by_email(email: str) -> Optional[dict]:
    users = _load_json(USERS_FILE)
    return users.get(email.lower())


def save_user(name: str, email: str, password_hash: str) -> dict:
    email_clean = email.lower().strip()
    users = _load_json(USERS_FILE)
    user_data = {
        "name": name.strip(),
        "email": email_clean,
        "password": password_hash,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    users[email_clean] = user_data
    _save_json(USERS_FILE, users)
    return user_data


def update_user_password(email: str, new_password: str) -> bool:
    email_clean = email.lower().strip()
    users = _load_json(USERS_FILE)
    if email_clean not in users:
        return False
    users[email_clean]["password"] = new_password
    _save_json(USERS_FILE, users)
    return True


def create_reset_token(email: str, expires_in_seconds: int = 3600) -> str:
    token = secrets.token_urlsafe(32)
    tokens = _load_json(TOKENS_FILE)
    tokens[token] = {
        "email": email.lower().strip(),
        "expires_at": time.time() + expires_in_seconds,
    }
    _save_json(TOKENS_FILE, tokens)
    return token


def verify_reset_token(token: str) -> Optional[str]:
    tokens = _load_json(TOKENS_FILE)
    record = tokens.get(token)
    if not record:
        return None
    if time.time() > record.get("expires_at", 0):
        # Expired
        del tokens[token]
        _save_json(TOKENS_FILE, tokens)
        return None
    return record.get("email")


def consume_reset_token(token: str) -> Optional[str]:
    email = verify_reset_token(token)
    if email:
        tokens = _load_json(TOKENS_FILE)
        if token in tokens:
            del tokens[token]
            _save_json(TOKENS_FILE, tokens)
    return email
