# apps/ml-service/pipelines/process_frame.py
"""
Single Frame Processing Pipeline
Processes individual frames for real-time or on-demand analysis.
"""

import modal
from typing import Any

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3",
    "httpx",
)

volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


@modal.function(
    gpu="T4",
    timeout=60,
    volumes={"/models": volume},
    image=image,
)
def process_frame(
    image_bytes: bytes,
    options: dict | None = None,
) -> dict[str, Any]:
    """
    Process a single frame/image.
    
    Args:
        image_bytes: Raw image bytes
        options: Processing options
            - blur_pii: Whether to blur faces/plates (default: True)
            - detect_objects: Run object detection (default: True)
            - extract_text: Run OCR (default: True)
            - classify_scene: Run scene classification (default: True)
            - analyze_quality: Analyze image quality (default: True)
            
    Returns:
        Processing results
    """
    options = options or {}
    
    # Import models
    from models.detector import Detector
    from models.blur import PrivacyBlur
    from models.ocr import TextRecognizer
    from models.classifier import SceneClassifier
    
    results: dict[str, Any] = {
        "success": True,
    }
    
    processed_bytes = image_bytes
    
    # 1. Privacy blur
    if options.get("blur_pii", True):
        blur = PrivacyBlur()
        processed_bytes, pii_counts = blur.blur_all_pii.remote(image_bytes)
        results["privacy"] = pii_counts
    
    # 2. Object detection
    if options.get("detect_objects", True):
        detector = Detector()
        detections = detector.detect.remote(processed_bytes)
        results["detections"] = detections
        results["entityCounts"] = detector.count_entities.remote(processed_bytes)
    
    # 3. OCR
    if options.get("extract_text", True):
        ocr = TextRecognizer()
        texts = ocr.extract_text.remote(processed_bytes)
        results["texts"] = texts
    
    # 4. Scene classification
    if options.get("classify_scene", True):
        classifier = SceneClassifier()
        scene = classifier.classify.remote(processed_bytes)
        results["scene"] = scene
    
    # 5. Quality analysis
    if options.get("analyze_quality", True):
        classifier = SceneClassifier()
        quality = classifier.get_scene_quality.remote(processed_bytes)
        results["quality"] = quality
    
    # Include processed image if PII was blurred
    if options.get("blur_pii", True) and options.get("return_image", False):
        import base64
        results["processedImage"] = base64.b64encode(processed_bytes).decode('utf-8')
    
    return results


@modal.function()
@modal.web_endpoint(method="POST")
def process_frame_endpoint(request: dict) -> dict:
    """
    Web endpoint for processing single frames.
    
    Request body:
    - image: Base64 encoded image OR
    - imageUrl: URL to fetch image from
    - options: Processing options
    """
    import base64
    import httpx
    
    # Get image bytes
    if "image" in request:
        image_bytes = base64.b64decode(request["image"])
    elif "imageUrl" in request:
        response = httpx.get(request["imageUrl"], timeout=30)
        response.raise_for_status()
        image_bytes = response.content
    else:
        return {"error": "No image provided. Use 'image' (base64) or 'imageUrl'"}
    
    options = request.get("options", {})
    
    result = process_frame.remote(image_bytes, options)
    return result


@modal.function(
    gpu="T4",
    timeout=120,
    volumes={"/models": volume},
    image=image,
)
def process_frame_batch(
    images: list[bytes],
    options: dict | None = None,
) -> list[dict[str, Any]]:
    """Process multiple frames in batch for efficiency."""
    return [process_frame.remote(img, options) for img in images]
