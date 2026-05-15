FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir flask flask-cors requests gunicorn

COPY . .

CMD ["python", "start.py"]