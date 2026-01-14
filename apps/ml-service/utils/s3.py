# apps/ml-service/utils/s3.py
"""
S3/R2 Storage Utilities
"""

import os
from typing import Any, Generator
import boto3
from botocore.config import Config


class S3Client:
    """S3/R2 client wrapper for CityPulse ML service."""
    
    def __init__(self):
        self.endpoint = os.environ.get('S3_ENDPOINT')
        self.bucket = os.environ.get('S3_BUCKET', 'citypulse-uploads')
        
        self.client = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
            config=Config(
                signature_version='s3v4',
                retries={'max_attempts': 3, 'mode': 'adaptive'}
            ),
        )
    
    def download_bytes(self, key: str) -> bytes:
        """Download object as bytes."""
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response['Body'].read()
    
    def upload_bytes(
        self,
        key: str,
        data: bytes,
        content_type: str = 'application/octet-stream',
    ) -> str:
        """Upload bytes to S3."""
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return f"s3://{self.bucket}/{key}"
    
    def list_objects(
        self,
        prefix: str,
        extensions: list[str] | None = None,
    ) -> Generator[str, None, None]:
        """List objects with optional extension filter."""
        paginator = self.client.get_paginator('list_objects_v2')
        
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            if 'Contents' not in page:
                continue
            
            for obj in page['Contents']:
                key = obj['Key']
                if extensions is None or any(key.endswith(ext) for ext in extensions):
                    yield key
    
    def generate_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
        method: str = 'get_object',
    ) -> str:
        """Generate presigned URL for object access."""
        return self.client.generate_presigned_url(
            method,
            Params={'Bucket': self.bucket, 'Key': key},
            ExpiresIn=expires_in,
        )
    
    def copy_object(self, source_key: str, dest_key: str) -> None:
        """Copy object within bucket."""
        self.client.copy_object(
            Bucket=self.bucket,
            CopySource={'Bucket': self.bucket, 'Key': source_key},
            Key=dest_key,
        )
    
    def delete_object(self, key: str) -> None:
        """Delete object."""
        self.client.delete_object(Bucket=self.bucket, Key=key)
    
    def object_exists(self, key: str) -> bool:
        """Check if object exists."""
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except:
            return False
