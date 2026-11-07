from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import Field


class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str = Field(default="https://c--a7df047d-736b-4998-9e77-39f44ed2a21d-prod.lovable.cloud")
    supabase_anon_key: str = Field(default="sb_publishable_fJvRXUq0J_G1xG3Q93WvgA_NkTrduxk")
    supabase_service_role_key: str = Field(default="")
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    debug: bool = Field(default=True)
    
    # External API (HodHod Platform)
    hodot_base_url: str = Field(default="https://staging.mytestdomain.club")
    hodot_api_path: str = Field(default="/api/v1/")
    
    # AI Engine Configuration
    ai_confidence_threshold: float = Field(default=0.4)
    max_batch_size: int = Field(default=1000)
    max_file_size_mb: int = Field(default=5)
    
    model_config = {
        "extra": "ignore",
        "env_file": ".env",
        "case_sensitive": False
    }


settings = Settings()