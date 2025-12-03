"""
Apply module - Apply patches to Chromium source.

Provides commands for applying patches:
- apply_all: Apply all patches from patches directory
- apply_feature: Apply patches for a specific feature
- apply_patch: Apply patch for a single file
"""

from .apply_all import apply_all_patches, ApplyAllModule
from .apply_feature import apply_feature_patches, ApplyFeatureModule
from .apply_patch import apply_single_file_patch

__all__ = [
    "apply_all_patches",
    "ApplyAllModule",
    "apply_feature_patches",
    "ApplyFeatureModule",
    "apply_single_file_patch",
]
