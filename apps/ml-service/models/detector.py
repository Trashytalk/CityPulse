# apps/ml-service/models/detector.py
"""
Object Detection using YOLOv8
Detects vehicles, pedestrians, traffic signs, buildings, etc.
"""

import modal
from typing import Any

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch>=2.0",
    "torchvision", 
    "ultralytics",
    "opencv-python-headless",
    "numpy",
)

volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


@modal.cls(gpu="T4", volumes={"/models": volume}, image=image)
class Detector:
    """YOLOv8-based object detector for street scene analysis."""
    
    # Classes we care about for CityPulse
    RELEVANT_CLASSES = {
        "car", "motorcycle", "bus", "truck", "bicycle",
        "person", "traffic light", "stop sign",
        "fire hydrant", "parking meter", "bench",
    }
    
    @modal.enter()
    def load_model(self):
        """Load model on container startup."""
        from ultralytics import YOLO
        import os
        
        model_path = "/models/yolov8n.pt"
        
        # Download if not exists
        if not os.path.exists(model_path):
            self.model = YOLO("yolov8n.pt")
            self.model.save(model_path)
        else:
            self.model = YOLO(model_path)
        
        # Warm up
        import numpy as np
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self.model(dummy, verbose=False)
    
    @modal.method()
    def detect(self, image_bytes: bytes, confidence_threshold: float = 0.5) -> list[dict[str, Any]]:
        """
        Detect objects in image.
        
        Args:
            image_bytes: Raw image bytes (JPEG/PNG)
            confidence_threshold: Minimum confidence score
            
        Returns:
            List of detections with class, confidence, bbox
        """
        import cv2
        import numpy as np
        
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return []
        
        # Run detection
        results = self.model(img, verbose=False)
        
        # Extract detections
        detections = []
        for r in results:
            for box in r.boxes:
                class_name = self.model.names[int(box.cls)]
                confidence = float(box.conf)
                
                # Filter by confidence and relevance
                if confidence >= confidence_threshold and class_name in self.RELEVANT_CLASSES:
                    bbox = box.xyxy[0].tolist()
                    detections.append({
                        "class": class_name,
                        "confidence": round(confidence, 3),
                        "bbox": {
                            "x1": int(bbox[0]),
                            "y1": int(bbox[1]),
                            "x2": int(bbox[2]),
                            "y2": int(bbox[3]),
                        },
                        "center": {
                            "x": int((bbox[0] + bbox[2]) / 2),
                            "y": int((bbox[1] + bbox[3]) / 2),
                        }
                    })
        
        return detections
    
    @modal.method()
    def detect_batch(self, images: list[bytes], confidence_threshold: float = 0.5) -> list[list[dict[str, Any]]]:
        """Detect objects in batch of images."""
        return [self.detect(img, confidence_threshold) for img in images]
    
    @modal.method()
    def count_entities(self, image_bytes: bytes) -> dict[str, int]:
        """Count entities by class in image."""
        detections = self.detect(image_bytes)
        counts: dict[str, int] = {}
        for d in detections:
            class_name = d["class"]
            counts[class_name] = counts.get(class_name, 0) + 1
        return counts
