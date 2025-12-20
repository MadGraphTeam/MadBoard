#!/usr/bin/env python3
"""Development server runner with automatic frontend building."""
import os
import subprocess
import sys

def run():
    """Run the development server."""
    # Get the project root
    project_root = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(project_root, 'madboard', 'frontend')
    
    # Install frontend dependencies if needed
    node_modules = os.path.join(frontend_dir, 'node_modules')
    if not os.path.exists(node_modules):
        print("Installing frontend dependencies...")
        subprocess.check_call(['npm', 'install'], cwd=frontend_dir)
    
    # Build the frontend
    print("Building frontend...")
    subprocess.check_call(['npm', 'run', 'build'], cwd=frontend_dir)
    
    # Update app.py to serve the built frontend
    app_file = os.path.join(project_root, 'madboard', 'backend', 'app.py')
    
    # Now run the server
    print("\nStarting MadBoard server...")
    from madboard.backend.server import run_server
    run_server()

if __name__ == '__main__':
    run()
