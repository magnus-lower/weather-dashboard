# Use official Python image with a specific version (slim for smaller size)
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed for some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev libssl-dev curl build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy rest of the app
COPY . .

# Create a non-root user
RUN adduser --disabled-password --gecos '' appuser

# Create instance directory and set proper permissions
RUN mkdir -p /app/instance && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables for production
ENV FLASK_CONFIG=production

# Expose the port used by Gunicorn
EXPOSE 8080

# Start the application using Gunicorn with correct app module
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]
