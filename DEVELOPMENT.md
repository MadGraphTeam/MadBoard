# Development Instructions

To set up and run the MadBoard application:

## Installation

1. Clone the repository
2. Install the package in development mode:
   ```bash
   pip install -e .
   ```

3. Install frontend dependencies:
   ```bash
   cd madboard/frontend
   npm install
   ```

## Development

Run the development server with:
```bash
python run_dev.py
```

This will:
- Build the React frontend
- Start the Flask backend server
- Automatically open the browser to `http://localhost:5000`

## Production Build

To build the complete package:

```bash
python -m madboard.build
```

This builds the frontend and copies it to the backend's static directory.

Then install and run:
```bash
pip install .
madboard
```

## Project Structure

```
madboard/
├── madboard/
│   ├── __init__.py
│   ├── backend/
│   │   ├── __init__.py
│   │   ├── app.py           # Flask app factory
│   │   ├── routes.py        # API routes
│   │   └── server.py        # Development server
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── App.js
│       │   └── index.js
│       └── package.json
├── setup.py                 # Package setup
├── MANIFEST.in             # Package manifest
├── run_dev.py              # Development runner
└── README.md
```

## Features

- **Flask Backend**: RESTful API with CORS support
- **React Frontend**: Material UI based interface with:
  - Left sidebar with navigation menu
  - Top tab bar with Home, Dashboard, Settings tabs
  - MadBoard branding in the top left
  - Main content area in the bottom right
- **Installable Package**: Can be installed as a Python module
- **Auto-opening Browser**: Server automatically opens the frontend on startup
- **Development Ready**: Hot-reload for both frontend and backend

