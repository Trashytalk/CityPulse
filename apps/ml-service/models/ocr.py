# apps/ml-service/models/ocr.py
"""
OCR - Text Recognition
Extracts text from street signs, shop names, etc.
"""

import modal
from typing import Any

image = modal.Image.debian_slim(python_version="3.11").apt_install(
    "libgl1-mesa-glx",
    "libglib2.0-0",
).pip_install(
    "paddlepaddle",
    "paddleocr",
    "opencv-python-headless",
    "numpy",
    "pillow",
)

volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


@modal.cls(gpu="T4", volumes={"/models": volume}, image=image, timeout=300)
class TextRecognizer:
    """PaddleOCR-based text recognition for street scenes."""
    
    @modal.enter()
    def load_model(self):
        """Load PaddleOCR model."""
        from paddleocr import PaddleOCR
        import os
        
        # Set model cache directory
        os.environ['PPOCR_HOME'] = '/models/paddleocr'
        
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=True,
            show_log=False,
        )
    
    @modal.method()
    def extract_text(self, image_bytes: bytes, min_confidence: float = 0.7) -> list[dict[str, Any]]:
        """
        Extract text from image.
        
        Returns:
            List of text regions with text, confidence, and bounding box
        """
        import cv2
        import numpy as np
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return []
        
        results = self.ocr.ocr(img, cls=True)
        
        text_regions = []
        if results and results[0]:
            for line in results[0]:
                bbox, (text, confidence) = line
                
                if confidence >= min_confidence:
                    # bbox is [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
                    x1, y1 = int(bbox[0][0]), int(bbox[0][1])
                    x2, y2 = int(bbox[2][0]), int(bbox[2][1])
                    
                    text_regions.append({
                        "text": text,
                        "confidence": round(confidence, 3),
                        "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                        "center": {"x": (x1 + x2) // 2, "y": (y1 + y2) // 2},
                    })
        
        return text_regions
    
    @modal.method()
    def extract_signs(self, image_bytes: bytes) -> list[dict[str, Any]]:
        """
        Extract text specifically from signs (larger, higher confidence).
        Filters for likely street signs, shop names, etc.
        """
        all_text = self.extract_text(image_bytes, min_confidence=0.8)
        
        # Filter for sign-like text (larger regions, uppercase tendency)
        signs = []
        for region in all_text:
            bbox = region["bbox"]
            width = bbox["x2"] - bbox["x1"]
            height = bbox["y2"] - bbox["y1"]
            
            # Signs tend to be larger and more horizontal
            if width > 50 and height > 15 and width / height > 1.5:
                region["type"] = "sign"
                signs.append(region)
        
        return signs
    
    @modal.method()
    def extract_batch(self, images: list[bytes]) -> list[list[dict[str, Any]]]:
        """Extract text from batch of images."""
        return [self.extract_text(img) for img in images]
