FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN groupadd --system --gid 1001 pyapp && useradd --system --uid 1001 --gid pyapp dashuser
USER dashuser

EXPOSE 8050

CMD ["sh", "-c", "python entorno.py && exec gunicorn -b 0.0.0.0:8050 app:server"]
