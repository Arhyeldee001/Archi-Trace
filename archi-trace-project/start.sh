#!/bin/bash

mkdir -p frontend/avatars

export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"

exec gunicorn backend.main:app --bind 0.0.0.0:$PORT --worker-class uvicorn.workers.UvicornWorker
