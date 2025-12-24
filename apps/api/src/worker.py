"""
Celery worker configuration.
"""
from celery import Celery
from src.core.config import settings

celery = Celery(
    "adsim",
    broker=settings.redis_url,
    backend=settings.redis_url.replace("/0", "/1"),
    include=["src.tasks.simulation"],
)

# Celery configuration
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3300,  # Soft limit at 55 minutes
    worker_prefetch_multiplier=1,  # One task at a time for simulation
    task_acks_late=True,  # Acknowledge after completion
    task_reject_on_worker_lost=True,  # Retry if worker dies
)

# Retry policy
celery.conf.task_default_retry_delay = 5
celery.conf.task_max_retries = 3
