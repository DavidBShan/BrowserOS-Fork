"""
Feature module - Manage feature-to-file mappings.

Provides commands for managing features:
- add_feature: Add files from a commit to a feature
- list_features: List all defined features
- show_feature: Show details of a specific feature
"""

from .feature import (
    add_feature,
    AddFeatureModule,
    list_features,
    ListFeaturesModule,
    show_feature,
    ShowFeatureModule,
)

__all__ = [
    "add_feature",
    "AddFeatureModule",
    "list_features",
    "ListFeaturesModule",
    "show_feature",
    "ShowFeatureModule",
]
