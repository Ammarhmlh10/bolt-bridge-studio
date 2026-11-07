"""
Run the backend server
"""
import sys
import os

# Add parent directory to path (SmartHoop folder)
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, project_root)

import uvicorn
from backend.config import settings


if __name__ == "__main__":
    print("=" * 50)
    print("🚀 Starting Hudhud Backend Server")
    print("=" * 50)
    print(f"Server: http://{settings.api_host}:{settings.api_port}")
    print(f"API Docs: http://{settings.api_host}:{settings.api_port}/docs")
    print("=" * 50)
    
    # Run from project root so backend module is importable
    uvicorn.run(
        "backend.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        reload_dirs=[backend_dir],
        cwd=project_root
    )