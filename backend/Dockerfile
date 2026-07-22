FROM python:3.10-slim

WORKDIR /code

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

COPY data-ml/src/ ./data-ml/src/

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}