#!/usr/bin/env python3
"""
Environment variable configuration for BrowserOS build system

This module provides centralized access to all environment variables used by the build system.
It provides type-safe access, defaults, and clear documentation of what each variable is for.

The module automatically loads .env files from the project root on import.
"""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


def _load_dotenv_file():
    """Load .env file from project root (packages/browseros parent directory)"""
    # Find project root by going up from this file's location
    # This file is at: packages/browseros/build/common/env.py
    # Project root is at: packages/browseros/../../ (the repo root)
    current_dir = Path(__file__).parent  # common/
    browseros_root = current_dir.parent.parent  # packages/browseros/
    project_root = browseros_root.parent.parent  # repo root

    # Try loading .env from multiple locations (most specific first)
    env_locations = [
        browseros_root / ".env",  # packages/browseros/.env
        project_root / ".env",  # repo root .env
    ]

    for env_path in env_locations:
        if env_path.exists():
            load_dotenv(env_path)
            return


# Load .env on module import
_load_dotenv_file()


class EnvConfig:
    """
    Centralized environment variable configuration

    This class provides clean, type-safe access to all environment variables
    used by the build system. It serves as the single source of truth for
    what environment variables are available and what they're used for.

    Usage:
        env = EnvConfig()
        if env.chromium_src:
            chromium_path = Path(env.chromium_src)
    """

    # === Build Configuration ===

    @property
    def chromium_src(self) -> Optional[str]:
        """Path to Chromium source directory"""
        return os.environ.get("CHROMIUM_SRC")

    @property
    def arch(self) -> Optional[str]:
        """Target architecture (x64, arm64, universal)"""
        return os.environ.get("ARCH")

    @property
    def pythonpath(self) -> Optional[str]:
        """Python path for build scripts"""
        return os.environ.get("PYTHONPATH")

    @property
    def depot_tools_win_toolchain(self) -> str:
        """Windows depot_tools toolchain setting (0 = use system toolchain)"""
        return os.environ.get("DEPOT_TOOLS_WIN_TOOLCHAIN", "0")

    # === macOS Code Signing ===

    @property
    def macos_certificate_name(self) -> Optional[str]:
        """macOS code signing certificate name"""
        return os.environ.get("MACOS_CERTIFICATE_NAME")

    @property
    def macos_notarization_apple_id(self) -> Optional[str]:
        """Apple ID for macOS notarization"""
        return os.environ.get("PROD_MACOS_NOTARIZATION_APPLE_ID")

    @property
    def macos_notarization_team_id(self) -> Optional[str]:
        """Team ID for macOS notarization"""
        return os.environ.get("PROD_MACOS_NOTARIZATION_TEAM_ID")

    @property
    def macos_notarization_password(self) -> Optional[str]:
        """App-specific password for macOS notarization"""
        return os.environ.get("PROD_MACOS_NOTARIZATION_PWD")

    # === Windows Code Signing ===

    @property
    def code_sign_tool_path(self) -> Optional[str]:
        """Path to Windows code signing tool directory"""
        return os.environ.get("CODE_SIGN_TOOL_PATH")

    @property
    def esigner_username(self) -> Optional[str]:
        """eSigner username for Windows code signing"""
        return os.environ.get("ESIGNER_USERNAME")

    @property
    def esigner_password(self) -> Optional[str]:
        """eSigner password for Windows code signing"""
        return os.environ.get("ESIGNER_PASSWORD")

    @property
    def esigner_totp_secret(self) -> Optional[str]:
        """eSigner TOTP secret for Windows code signing"""
        return os.environ.get("ESIGNER_TOTP_SECRET")

    @property
    def esigner_credential_id(self) -> Optional[str]:
        """eSigner credential ID for Windows code signing"""
        return os.environ.get("ESIGNER_CREDENTIAL_ID")

    # === Upload & Distribution ===

    @property
    def gcs_bucket(self) -> str:
        """Google Cloud Storage bucket for artifact uploads

        Defaults to 'nxtscape' if not set via GCS_BUCKET env var
        """
        return os.environ.get("GCS_BUCKET", "nxtscape")

    @property
    def gcs_service_account_file(self) -> str:
        """Service account JSON file for GCS authentication

        Defaults to 'gclient.json' if not set via GCS_SERVICE_ACCOUNT_FILE env var
        """
        return os.environ.get("GCS_SERVICE_ACCOUNT_FILE", "gclient.json")

    # === Notifications ===

    @property
    def slack_webhook_url(self) -> Optional[str]:
        """Slack webhook URL for build notifications"""
        return os.environ.get("SLACK_WEBHOOK_URL")

    # === Helper Methods ===

    def get_macos_signing_config(self) -> dict:
        """
        Get all macOS signing configuration as a dict

        Returns:
            dict with keys: certificate_name, apple_id, team_id, notarization_pwd
        """
        return {
            "certificate_name": self.macos_certificate_name or "",
            "apple_id": self.macos_notarization_apple_id or "",
            "team_id": self.macos_notarization_team_id or "",
            "notarization_pwd": self.macos_notarization_password or "",
        }

    def get_windows_signing_config(self) -> dict:
        """
        Get all Windows signing configuration as a dict

        Returns:
            dict with keys: code_sign_tool_path, username, password, totp_secret, credential_id
        """
        return {
            "code_sign_tool_path": self.code_sign_tool_path or "",
            "username": self.esigner_username or "",
            "password": self.esigner_password or "",
            "totp_secret": self.esigner_totp_secret or "",
            "credential_id": self.esigner_credential_id or "",
        }

    def validate_required(self, *var_names: str) -> None:
        """
        Validate that required environment variables are set

        Args:
            *var_names: Variable names to check (e.g., "chromium_src", "gcs_bucket")

        Raises:
            ValueError: If any required variable is not set

        Example:
            env = EnvConfig()
            env.validate_required("chromium_src", "macos_certificate_name")
        """
        missing = []
        for var_name in var_names:
            # Convert property name to env var name (e.g., chromium_src -> CHROMIUM_SRC)
            env_var = var_name.upper()
            if not os.environ.get(env_var):
                missing.append(env_var)

        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}"
            )

    def has_macos_signing_config(self) -> bool:
        """Check if all macOS signing environment variables are set"""
        config = self.get_macos_signing_config()
        return all(config.values())

    def has_windows_signing_config(self) -> bool:
        """Check if all Windows signing environment variables are set"""
        config = self.get_windows_signing_config()
        return all(config.values())
