# Use the official lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for some Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Ensure the data directory exists
RUN mkdir -p /app/data

# Expose the port that FastAPI will run on
EXPOSE 8000

# Use PORT env variable if set by cloud platform, otherwise default to 8000
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
