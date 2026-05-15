FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir flask flask-cors requests gunicorn

COPY . .

CMD ["sh", "-c", "gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60"]