# apps/ml-service/utils/video.py
"""
Video Processing Utilities
"""

import tempfile
import subprocess
from typing import Any, Generator
from pathlib import Path


class VideoProcessor:
    """Video processing utilities for dashcam footage."""
    
    @staticmethod
    def extract_frames(
        video_path: str,
        output_dir: str,
        fps: float = 1.0,
        quality: int = 2,
    ) -> list[str]:
        """
        Extract frames from video using FFmpeg.
        
        Args:
            video_path: Path to video file
            output_dir: Directory to save frames
            fps: Frames per second to extract
            quality: JPEG quality (2-31, lower is better)
            
        Returns:
            List of extracted frame paths
        """
        output_pattern = f"{output_dir}/frame_%06d.jpg"
        
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vf', f'fps={fps}',
            '-q:v', str(quality),
            '-y',
            output_pattern,
        ]
        
        subprocess.run(cmd, capture_output=True, check=True)
        
        # Get list of extracted frames
        output_path = Path(output_dir)
        frames = sorted(output_path.glob('frame_*.jpg'))
        
        return [str(f) for f in frames]
    
    @staticmethod
    def extract_frames_with_timestamps(
        video_path: str,
        output_dir: str,
        fps: float = 1.0,
    ) -> list[dict[str, Any]]:
        """
        Extract frames with their timestamps.
        
        Returns:
            List of dicts with path, timestamp_ms
        """
        import cv2
        
        cap = cv2.VideoCapture(video_path)
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(video_fps / fps)
        
        frames = []
        frame_count = 0
        saved_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % frame_interval == 0:
                timestamp_ms = int((frame_count / video_fps) * 1000)
                output_path = f"{output_dir}/frame_{saved_count:06d}.jpg"
                
                cv2.imwrite(output_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                
                frames.append({
                    "path": output_path,
                    "timestamp_ms": timestamp_ms,
                    "frame_number": frame_count,
                })
                saved_count += 1
            
            frame_count += 1
        
        cap.release()
        return frames
    
    @staticmethod
    def get_video_info(video_path: str) -> dict[str, Any]:
        """Get video metadata."""
        import cv2
        
        cap = cv2.VideoCapture(video_path)
        
        info = {
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            "duration_s": 0,
        }
        
        if info["fps"] > 0:
            info["duration_s"] = info["frame_count"] / info["fps"]
        
        cap.release()
        return info
    
    @staticmethod
    def create_timelapse(
        frame_paths: list[str],
        output_path: str,
        fps: int = 30,
    ) -> str:
        """
        Create timelapse video from frames.
        
        Args:
            frame_paths: List of frame file paths
            output_path: Output video path
            fps: Output video FPS
            
        Returns:
            Path to output video
        """
        if not frame_paths:
            raise ValueError("No frames provided")
        
        # Create temporary file list
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            for path in frame_paths:
                f.write(f"file '{path}'\n")
            list_file = f.name
        
        try:
            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', list_file,
                '-vf', f'fps={fps}',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-y',
                output_path,
            ]
            
            subprocess.run(cmd, capture_output=True, check=True)
            return output_path
            
        finally:
            Path(list_file).unlink(missing_ok=True)
    
    @staticmethod
    def stream_frames(
        video_path: str,
        fps: float = 1.0,
    ) -> Generator[tuple[bytes, int], None, None]:
        """
        Stream frames from video without saving to disk.
        
        Yields:
            Tuple of (frame_bytes, timestamp_ms)
        """
        import cv2
        
        cap = cv2.VideoCapture(video_path)
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(video_fps / fps) if video_fps > 0 else 1
        
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % frame_interval == 0:
                timestamp_ms = int((frame_count / video_fps) * 1000) if video_fps > 0 else 0
                
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                yield buffer.tobytes(), timestamp_ms
            
            frame_count += 1
        
        cap.release()
