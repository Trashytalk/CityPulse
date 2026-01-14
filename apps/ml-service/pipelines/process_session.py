# apps/ml-service/pipelines/process_session.py
"""
Session Processing Pipeline
Processes an entire collection session including all images.
"""

import modal
from typing import Any
import os

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3",
    "httpx",
)

volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


@modal.function(
    gpu="T4",
    timeout=1800,  # 30 minutes max
    volumes={"/models": volume},
    image=image,
    secrets=[modal.Secret.from_name("citypulse-secrets")],
)
def process_session(
    session_id: str,
    data_url: str,
    callback_url: str | None = None,
) -> dict[str, Any]:
    """
    Process an entire collection session.
    
    Args:
        session_id: The session ID from the API
        data_url: S3/R2 URL containing session data
        callback_url: Optional webhook to call when complete
        
    Returns:
        Processing results including entities, quality scores, etc.
    """
    import boto3
    import tempfile
    import json
    import httpx
    
    # Import models
    from models.detector import Detector
    from models.blur import PrivacyBlur
    from models.ocr import TextRecognizer
    from models.classifier import SceneClassifier
    
    # Initialize model instances
    detector = Detector()
    blur = PrivacyBlur()
    ocr = TextRecognizer()
    classifier = SceneClassifier()
    
    # S3 client
    s3 = boto3.client(
        's3',
        endpoint_url=os.environ.get('S3_ENDPOINT'),
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    )
    
    # Parse bucket and key from URL
    # Format: s3://bucket/key or https://endpoint/bucket/key
    bucket = os.environ.get('S3_BUCKET', 'citypulse-uploads')
    key_prefix = f"sessions/{session_id}"
    
    results = {
        "sessionId": session_id,
        "frames": [],
        "entities": {
            "vehicles": 0,
            "pedestrians": 0,
            "signs": 0,
            "buildings": 0,
        },
        "texts": [],
        "scenes": {},
        "quality": {
            "avgSharpness": 0,
            "avgBrightness": 0,
            "avgCoverage": 0,
            "overallScore": 0,
        },
        "privacy": {
            "facesBlurred": 0,
            "platesBlurred": 0,
        },
        "processed": 0,
        "failed": 0,
    }
    
    try:
        # List all images in session
        response = s3.list_objects_v2(Bucket=bucket, Prefix=f"{key_prefix}/photos/")
        
        if 'Contents' not in response:
            return {**results, "error": "No images found"}
        
        image_keys = [obj['Key'] for obj in response['Contents'] if obj['Key'].endswith(('.jpg', '.jpeg', '.png'))]
        
        quality_scores = []
        scene_categories = {}
        
        for i, key in enumerate(image_keys):
            try:
                # Download image
                img_response = s3.get_object(Bucket=bucket, Key=key)
                image_bytes = img_response['Body'].read()
                
                # 1. Privacy blur
                blurred_bytes, pii_counts = blur.blur_all_pii.remote(image_bytes)
                results["privacy"]["facesBlurred"] += pii_counts["faces"]
                results["privacy"]["platesBlurred"] += pii_counts["plates"]
                
                # 2. Object detection
                detections = detector.detect.remote(blurred_bytes)
                for d in detections:
                    if d["class"] in ["car", "motorcycle", "bus", "truck"]:
                        results["entities"]["vehicles"] += 1
                    elif d["class"] == "person":
                        results["entities"]["pedestrians"] += 1
                    elif d["class"] in ["traffic light", "stop sign"]:
                        results["entities"]["signs"] += 1
                
                # 3. OCR for signs
                texts = ocr.extract_signs.remote(blurred_bytes)
                results["texts"].extend([t["text"] for t in texts])
                
                # 4. Scene classification
                scene = classifier.classify.remote(blurred_bytes)
                cat = scene["category"]
                scene_categories[cat] = scene_categories.get(cat, 0) + 1
                
                # 5. Quality analysis
                quality = classifier.get_scene_quality.remote(blurred_bytes)
                quality_scores.append(quality)
                
                # 6. Upload blurred image back
                blurred_key = key.replace('/photos/', '/processed/')
                s3.put_object(
                    Bucket=bucket,
                    Key=blurred_key,
                    Body=blurred_bytes,
                    ContentType='image/jpeg',
                )
                
                results["frames"].append({
                    "index": i,
                    "key": blurred_key,
                    "detections": len(detections),
                    "quality": quality["quality"],
                })
                results["processed"] += 1
                
            except Exception as e:
                results["failed"] += 1
                print(f"Error processing {key}: {e}")
        
        # Aggregate quality scores
        if quality_scores:
            results["quality"] = {
                "avgSharpness": round(sum(q["sharpness"] for q in quality_scores) / len(quality_scores), 3),
                "avgBrightness": round(sum(q["brightness"] for q in quality_scores) / len(quality_scores), 3),
                "avgCoverage": round(sum(q["coverage"] for q in quality_scores) / len(quality_scores), 3),
                "overallScore": round(sum(q["quality"] for q in quality_scores) / len(quality_scores), 3),
            }
        
        results["scenes"] = scene_categories
        
        # Callback to API
        if callback_url:
            try:
                httpx.post(callback_url, json=results, timeout=30)
            except Exception as e:
                print(f"Callback failed: {e}")
        
        return results
        
    except Exception as e:
        return {**results, "error": str(e)}


@modal.function()
@modal.web_endpoint(method="POST")
def process_session_endpoint(request: dict) -> dict:
    """Web endpoint for processing sessions."""
    result = process_session.remote(
        session_id=request["sessionId"],
        data_url=request.get("dataUrl", ""),
        callback_url=request.get("callbackUrl"),
    )
    return result
