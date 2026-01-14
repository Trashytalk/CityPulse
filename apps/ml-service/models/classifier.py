# apps/ml-service/models/classifier.py
"""
Scene Classification
Classifies street scenes into categories for mapping purposes.
"""

import modal
from typing import Any

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch>=2.0",
    "torchvision",
    "opencv-python-headless",
    "numpy",
    "pillow",
)

volume = modal.Volume.from_name("citypulse-models", create_if_missing=True)


@modal.cls(gpu="T4", volumes={"/models": volume}, image=image)
class SceneClassifier:
    """Classify street scenes into mapping-relevant categories."""
    
    # Scene categories relevant for CityPulse
    CATEGORIES = [
        "residential",
        "commercial",
        "industrial",
        "park",
        "highway",
        "intersection",
        "parking",
        "construction",
        "waterfront",
        "rural",
    ]
    
    @modal.enter()
    def load_model(self):
        """Load pretrained ResNet for scene classification."""
        import torch
        import torchvision.models as models
        import torchvision.transforms as transforms
        import os
        
        # Use pretrained ResNet as feature extractor
        self.model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        self.model.eval()
        
        if torch.cuda.is_available():
            self.model = self.model.cuda()
        
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])
        
        # ImageNet class mappings to our categories
        self.category_mappings = {
            "residential": [627, 648, 649, 714, 715],  # homes, townhouse
            "commercial": [462, 538, 580, 581],  # shop, store
            "highway": [717, 718, 752],  # road, freeway
            "park": [975, 976, 977, 978],  # green, nature
        }
    
    @modal.method()
    def classify(self, image_bytes: bytes) -> dict[str, Any]:
        """
        Classify scene type.
        
        Returns:
            Dict with predicted category and confidence scores
        """
        import torch
        from PIL import Image
        import io
        
        # Load and transform image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = self.transform(image).unsqueeze(0)
        
        if torch.cuda.is_available():
            input_tensor = input_tensor.cuda()
        
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
        
        # Map ImageNet predictions to our categories
        category_scores = {}
        for category, class_ids in self.category_mappings.items():
            score = sum(float(probabilities[cid]) for cid in class_ids if cid < len(probabilities))
            category_scores[category] = round(score, 4)
        
        # Get top prediction
        if category_scores:
            top_category = max(category_scores.items(), key=lambda x: x[1])
            return {
                "category": top_category[0],
                "confidence": top_category[1],
                "all_scores": category_scores,
            }
        
        return {
            "category": "unknown",
            "confidence": 0,
            "all_scores": category_scores,
        }
    
    @modal.method()
    def classify_batch(self, images: list[bytes]) -> list[dict[str, Any]]:
        """Classify batch of images."""
        return [self.classify(img) for img in images]
    
    @modal.method()
    def get_scene_quality(self, image_bytes: bytes) -> dict[str, float]:
        """
        Analyze image quality for mapping purposes.
        
        Returns:
            Quality metrics like blur, brightness, coverage
        """
        import cv2
        import numpy as np
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"quality": 0, "blur": 0, "brightness": 0}
        
        # Blur detection (Laplacian variance)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize blur score (higher is sharper)
        blur_normalized = min(1.0, blur_score / 500)
        
        # Brightness
        brightness = np.mean(gray) / 255
        
        # Coverage (non-sky pixels)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        # Sky is typically high brightness, low saturation, blue hue
        sky_mask = (hsv[:,:,0] > 90) & (hsv[:,:,0] < 130) & (hsv[:,:,1] < 100)
        coverage = 1 - (np.sum(sky_mask) / sky_mask.size)
        
        # Overall quality
        quality = (blur_normalized * 0.5 + brightness * 0.2 + coverage * 0.3)
        
        return {
            "quality": round(quality, 3),
            "sharpness": round(blur_normalized, 3),
            "brightness": round(brightness, 3),
            "coverage": round(coverage, 3),
        }
