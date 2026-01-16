#!/usr/bin/env python3
import os
import sys
from pathlib import Path

print("Testing Archi Trace Deployment Setup")
print("=" * 50)

try:
    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    from main import app
    print("FastAPI app imports successfully")
    
    for route in app.routes:
        if hasattr(route, 'app') and hasattr(route.app, 'directory'):
            print(f"Static files mounted at: {route.path}")
            break
except Exception as e:
    print(f"Import error: {e}")

print("")
print("Directory check:")
required = ["backend", "frontend/templates", "frontend/css", "frontend/js"]
for dir_path in required:
    full_path = Path(__file__).parent / dir_path
    if full_path.exists():
        print(f"   OK {dir_path}")
    else:
        print(f"   MISSING {dir_path}")

print("")
print("Test complete! Run: python -m uvicorn backend.main:app --reload")
