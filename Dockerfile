FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir flask flask-cors requests gunicorn

COPY . .

CMD ["sh", "-c", "cd /app/backend && exec gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120"]
