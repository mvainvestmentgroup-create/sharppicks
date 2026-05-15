import os
import subprocess
port = os.environ.get('PORT', '8080')
subprocess.run(['gunicorn', '--chdir', 'backend', 'app:app', '--bind', f'0.0.0.0:{port}', '--workers', '2', '--timeout', '60'])