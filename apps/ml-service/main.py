# apps/ml-service/main.py
"""
CityPulse ML Service
Serverless GPU inference on Modal.com
"""

import modal
from typing import Any

# Define the container image with all dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch>=2.0",
    "torchvision",
    "ultralytics",
    "opencv-python-headless",
    "paddleocr",
    "paddlepaddle",
    "boto3",
    "pillow",
    "numpy",
    "httpx",
)

# Create Modal app
app = modal.App("citypulse-ml", image=image)

# Shared volume for model weights (persisted)
volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


# Import model classes
from models.detector import Detector
from models.blur import PrivacyBlur
from models.ocr import TextRecognizer
from models.classifier import SceneClassifier
from pipelines.process_session import process_session, process_session_endpoint
from pipelines.process_frame import process_frame, process_frame_endpoint


# Re-export for Modal
app.cls(Detector)
app.cls(PrivacyBlur)
app.cls(TextRecognizer)
app.cls(SceneClassifier)
app.function(process_session)
app.function(process_frame)


# Health check endpoint
@app.function()
@modal.web_endpoint(method="GET")
def health():
    return {"status": "healthy", "service": "citypulse-ml"}


if __name__ == "__main__":
    # Local testing
    print("CityPulse ML Service")
    print("Deploy with: modal deploy main.py")
