FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir flask flask-cors requests gunicorn

COPY . .

RUN chmod +x start.sh

CMD ["/bin/sh", "start.sh"]
