import os

print("--- Listing all .xlsx files recursively ---")
for root, dirs, files in os.walk("."):
    # Skip .venv and .git
    if ".venv" in root or ".git" in root or "node_modules" in root:
        continue
    for f in files:
        if f.endswith(".xlsx"):
            path = os.path.join(root, f)
            print(f"Path: {path:60} | Size: {os.path.getsize(path)} bytes")
