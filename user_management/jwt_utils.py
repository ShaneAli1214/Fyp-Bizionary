import base64
import json
import hmac
import hashlib
import time
import uuid
from django.conf import settings

def base64url_encode(data: bytes) -> str:
    """
    Encodes bytes to base64url string without padding.
    """
    return base64.urlsafe_b64encode(data).decode('utf-8').replace('=', '')

def base64url_decode(data: str) -> bytes:
    """
    Decodes a base64url string back to bytes, adding padding back if necessary.
    """
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def generate_jwt(payload: dict, expires_in: int = 3600) -> str:
    """
    Generates a secure HMAC-SHA256 signed JWT token.
    """
    header = {"alg": "HS256", "typ": "JWT"}
    
    payload_copy = payload.copy()
    payload_copy['exp'] = int(time.time()) + expires_in
    payload_copy['iat'] = int(time.time())
    if 'jti' not in payload_copy:
        payload_copy['jti'] = str(uuid.uuid4())
    
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_json = json.dumps(payload_copy, separators=(',', ':')).encode('utf-8')
    
    header_b64 = base64url_encode(header_json)
    payload_b64 = base64url_encode(payload_json)
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        signing_input,
        hashlib.sha256
    ).digest()
    
    signature_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt(token: str) -> dict:
    """
    Verifies a JWT token. Returns the payload dictionary if valid and not expired,
    otherwise returns None.
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            signing_input,
            hashlib.sha256
        ).digest()
        
        expected_signature_b64 = base64url_encode(expected_signature)
        
        # Use constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
        
        # Decode and parse payload
        payload_json = base64url_decode(payload_b64).decode('utf-8')
        payload = json.loads(payload_json)
        
        # Validate expiration
        if 'exp' in payload and payload['exp'] < time.time():
            return None
            
        return payload
    except Exception:
        return None

def generate_auth_tokens(user, device_name='Unknown Device', ip_address=None, location='Unknown Location'):
    """
    Generates a short-lived access token and a long-lived refresh token,
    creating an active UserSession in the database.
    """
    from .models import UserSession
    
    jti = str(uuid.uuid4())
    
    # Access Token: Expires in 15 minutes (900 seconds)
    access_payload = {
        'user_id': user.id,
        'username': user.username,
        'jti': jti,
        'token_type': 'access'
    }
    access_token = generate_jwt(access_payload, expires_in=900)
    
    # Refresh Token: Expires in 7 days (604800 seconds)
    refresh_payload = {
        'user_id': user.id,
        'jti': jti,
        'token_type': 'refresh'
    }
    refresh_token = generate_jwt(refresh_payload, expires_in=604800)
    
    # Create session tracking record
    UserSession.objects.create(
        user=user,
        session_key=jti,
        device=device_name,
        ip_address=ip_address,
        location=location,
        is_active=True
    )
    
    return access_token, refresh_token
