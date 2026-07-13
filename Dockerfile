# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Install system dependencies (needed for Pillow/image processing and psycopg2/mysql)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmariadb-dev-compat \
    libmariadb-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Create static directory to ensure collectstatic has a target
RUN mkdir -p /app/staticfiles

# Run migrations, update user credentials, collectstatic and start gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && python scripts/update_user_credentials.py && python manage.py collectstatic --noinput && gunicorn erp_system.wsgi:application --bind 0.0.0.0:8000 --timeout 600"]
