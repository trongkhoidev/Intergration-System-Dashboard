import requests
import os
from jwt_utils import create_token

# Load env
def load_env():
    env_path = ".env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value.strip()

load_env()

# Generate token
token = create_token(1, 'Admin', 'admin@integration.com', 'Admin', 1)
headers = {"Authorization": f"Bearer {token}"}

# Call API
try:
    url = "http://127.0.0.1:5001/api/dividends"
    print(f"Calling {url}...")
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
