# apps/ml-service/models/blur.py
"""
Privacy Blur - Face and License Plate Detection/Blur
Ensures GDPR/privacy compliance by blurring identifiable information.
"""

import modal
from typing import Any

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch>=2.0",
    "torchvision",
    "ultralytics",
    "opencv-python-headless",
    "numpy",
    "pillow",
)

volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


@modal.cls(gpu="T4", volumes={"/models": volume}, image=image)
class PrivacyBlur:
    """Detect and blur faces and license plates for privacy compliance."""
    
    @modal.enter()
    def load_models(self):
        """Load face and plate detection models."""
        import cv2
        import os
        
        # OpenCV's Haar Cascade for faces (fast, good enough)
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # For license plates, use a simple cascade or YOLO
        # We'll use the Russian plate cascade as a base (works for many formats)
        plate_cascade_path = cv2.data.haarcascades + 'haarcascade_russian_plate_number.xml'
        if os.path.exists(plate_cascade_path):
            self.plate_cascade = cv2.CascadeClassifier(plate_cascade_path)
        else:
            self.plate_cascade = None
    
    @modal.method()
    def detect_faces(self, image_bytes: bytes) -> list[dict[str, Any]]:
        """Detect faces in image."""
        import cv2
        import numpy as np
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return []
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        return [
            {"x": int(x), "y": int(y), "w": int(w), "h": int(h), "type": "face"}
            for (x, y, w, h) in faces
        ]
    
    @modal.method()
    def detect_plates(self, image_bytes: bytes) -> list[dict[str, Any]]:
        """Detect license plates in image."""
        import cv2
        import numpy as np
        
        if self.plate_cascade is None:
            return []
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return []
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        plates = self.plate_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(60, 20)
        )
        
        return [
            {"x": int(x), "y": int(y), "w": int(w), "h": int(h), "type": "plate"}
            for (x, y, w, h) in plates
        ]
    
    @modal.method()
    def blur_faces(self, image_bytes: bytes, blur_strength: int = 99) -> bytes:
        """Blur all faces in image."""
        import cv2
        import numpy as np
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return image_bytes
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        
        for (x, y, w, h) in faces:
            # Add padding
            pad = int(w * 0.1)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(img.shape[1], x + w + pad)
            y2 = min(img.shape[0], y + h + pad)
            
            roi = img[y1:y2, x1:x2]
            roi = cv2.GaussianBlur(roi, (blur_strength, blur_strength), 30)
            img[y1:y2, x1:x2] = roi
        
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return buffer.tobytes()
    
    @modal.method()
    def blur_all_pii(self, image_bytes: bytes, blur_strength: int = 99) -> tuple[bytes, dict[str, int]]:
        """
        Blur all PII (faces and plates) in image.
        
        Returns:
            Tuple of (blurred_image_bytes, counts_dict)
        """
        import cv2
        import numpy as np
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return image_bytes, {"faces": 0, "plates": 0}
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        
        # Detect plates
        plates = []
        if self.plate_cascade is not None:
            plates = self.plate_cascade.detectMultiScale(gray, 1.1, 3, minSize=(60, 20))
        
        # Blur all regions
        all_regions = list(faces) + list(plates)
        for (x, y, w, h) in all_regions:
            pad = int(w * 0.1)
            x1, y1 = max(0, x - pad), max(0, y - pad)
            x2, y2 = min(img.shape[1], x + w + pad), min(img.shape[0], y + h + pad)
            
            roi = img[y1:y2, x1:x2]
            roi = cv2.GaussianBlur(roi, (blur_strength, blur_strength), 30)
            img[y1:y2, x1:x2] = roi
        
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        return buffer.tobytes(), {"faces": len(faces), "plates": len(plates)}
