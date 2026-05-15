FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir flask flask-cors requests gunicorn

COPY . .

RUN echo "Testing imports..." && cd backend && python -c "import app; print('OK')"

EXPOSE 8080

CMD ["gunicorn", "--chdir", "/app/backend", "app:app", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "120", "--log-level", "debug"]