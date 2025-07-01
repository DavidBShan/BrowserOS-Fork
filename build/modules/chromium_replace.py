#!/usr/bin/env python3
"""
Chromium file replacement module for Nxtscape build system
"""

import sys
import shutil
from pathlib import Path
from context import BuildContext
from utils import log_info, log_success, log_error, log_warning


def replace_chromium_files(ctx: BuildContext, replacements=None) -> bool:
    """Replace files in chromium source with custom files from root_dir/chromium_src"""
    log_info("\n🔄 Replacing chromium files...")

    # Source directory containing replacement files
    replacement_dir = ctx.root_dir / "chromium_src"

    if not replacement_dir.exists():
        log_info(f"⚠️  No chromium_src directory found at: {replacement_dir}")
        return True

    replaced_count = 0

    # Find all files recursively in the replacement directory
    for src_file in replacement_dir.rglob("*"):
        if src_file.is_file():
            # Get relative path from chromium_src directory
            relative_path = src_file.relative_to(replacement_dir)

            # Destination path in actual chromium source
            dst_file = ctx.chromium_src / relative_path

            # Check if destination exists
            if not dst_file.exists():
                log_error(
                    f"    Destination file not found in chromium_src: {relative_path}"
                )
                raise FileNotFoundError(
                    f"Destination file not found in chromium_src: {relative_path}"
                )

            try:
                # Replace the file
                shutil.copy2(src_file, dst_file)
                log_info(f"    ✓ Replaced: {relative_path}")
                replaced_count += 1

            except Exception as e:
                log_error(f"    Error replacing file {relative_path}: {e}")
                raise

    log_success(f"Replaced {replaced_count} files")
    return True


def add_file_to_replacements(file_path: Path, chromium_src: Path, root_dir: Path) -> bool:
    """Add a file from chromium source to the replacement directory"""
    # Validate the file is within chromium_src
    try:
        relative_path = file_path.relative_to(chromium_src)
    except ValueError:
        log_error(f"File {file_path} is not within chromium source directory {chromium_src}")
        return False
    
    # Create destination path
    replacement_dir = root_dir / "chromium_src"
    dest_file = replacement_dir / relative_path
    
    log_info(f"📂 Adding file to replacements:")
    log_info(f"  Source: {file_path}")
    log_info(f"  Destination: {dest_file}")
    
    try:
        # Create parent directories if needed
        dest_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy the file
        shutil.copy2(file_path, dest_file)
        
        log_success(f"✓ File added to chromium_src replacements: {relative_path}")
        log_info(f"  This file will be replaced during builds with --chromium-replace flag")
        return True
    except Exception as e:
        log_error(f"Failed to add file: {e}")
        return False

