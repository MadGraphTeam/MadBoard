"""MadBoard - A simple web application."""
from setuptools import setup, find_packages
import os
import subprocess
import shutil

def build_frontend():
    """Build the React frontend during package installation."""
    frontend_dir = os.path.join(os.path.dirname(__file__), 'madboard', 'frontend')
    build_dir = os.path.join(frontend_dir, 'build')
    
    # Skip if already built
    if os.path.exists(build_dir):
        print("Frontend already built, skipping...")
        return
    
    print("Building React frontend...")
    
    # Check if node_modules exists
    node_modules = os.path.join(frontend_dir, 'node_modules')
    if not os.path.exists(node_modules):
        print("Installing frontend dependencies...")
        subprocess.check_call(['npm', 'install'], cwd=frontend_dir)
    
    # Build the frontend
    subprocess.check_call(['npm', 'run', 'build'], cwd=frontend_dir)
    print("Frontend build complete!")

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="madboard",
    version="0.1.0",
    author="Your Name",
    description="A simple web application with Python Flask backend and React frontend",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/theoheimel/madboard",
    packages=find_packages(),
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=[
        "flask>=2.3.0",
        "flask-cors>=4.0.0",
    ],
    entry_points={
        "console_scripts": [
            "madboard=madboard.backend.server:run_server",
        ],
    },
)
