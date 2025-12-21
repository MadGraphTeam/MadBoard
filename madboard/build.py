"""Build and packaging utilities for MadBoard."""

import os
import shutil
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
FRONTEND_DIR = PROJECT_ROOT / "madboard" / "frontend"
BUILD_DIR = FRONTEND_DIR / "build"
BACKEND_STATIC = PROJECT_ROOT / "madboard" / "backend" / "static"
BACKEND_TEMPLATES = PROJECT_ROOT / "madboard" / "backend" / "templates"


def build_frontend():
    """Build the React frontend."""
    print("Building React frontend...")

    # Install dependencies
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print("Installing frontend dependencies...")
        subprocess.check_call(["npm", "install"], cwd=str(FRONTEND_DIR))

    # Build
    subprocess.check_call(["npm", "run", "build"], cwd=str(FRONTEND_DIR))
    print("Frontend build complete!")


def copy_frontend_to_backend():
    """Copy built frontend to backend static directory."""
    if not BUILD_DIR.exists():
        print("Build directory not found. Run build_frontend first.")
        return False

    print(f"Copying frontend build to backend...")

    # Clear existing
    if BACKEND_STATIC.exists():
        shutil.rmtree(BACKEND_STATIC)

    # Copy build directory contents
    shutil.copytree(BUILD_DIR, BACKEND_STATIC)
    print(f"Frontend copied to {BACKEND_STATIC}")
    return True


def build_all():
    """Build frontend and copy to backend."""
    build_frontend()
    copy_frontend_to_backend()


if __name__ == "__main__":
    build_all()
