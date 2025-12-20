"""API routes for MadBoard backend."""
from flask import Blueprint

api_bp = Blueprint('api', __name__)


@api_bp.route('/status', methods=['GET'])
def get_status():
    """Get application status."""
    return {
        'message': 'MadBoard API is running',
        'version': '0.1.0'
    }, 200
