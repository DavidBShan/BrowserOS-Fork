#!/usr/bin/env python3
"""
Patch management module for Nxtscape build system
"""

import sys
import shutil
import subprocess
from pathlib import Path
from typing import Iterator, List
from context import BuildContext
from utils import log_info, log_error, log_success, log_warning, IS_WINDOWS


def apply_patches(ctx: BuildContext, interactive: bool = False) -> bool:
    """Apply Nxtscape patches"""
    if not ctx.apply_patches:
        log_info("\n⏭️  Skipping patches")
        return True
    
    log_info("\n🩹 Applying patches...")
    
    # Check if git is available
    if not shutil.which('git'):
        log_error("Git is not available in PATH")
        log_error("Please install Git to apply patches")
        raise RuntimeError("Git not found in PATH")
    
    # Get list of patches
    root_patches_dir = ctx.get_patches_dir()
    nxtscape_patches_dir = ctx.get_nxtscape_patches_dir()
    
    if not nxtscape_patches_dir.exists():
        log_error(f"Patches directory not found: {nxtscape_patches_dir}")
        raise FileNotFoundError(f"Patches directory not found: {nxtscape_patches_dir}")
    
    # get all patches in nxtscape_patches_dir
    patches = list(parse_series_file(root_patches_dir))
    
    if not patches:
        log_info("⚠️  No patches found to apply")
        return True
    
    log_info(f"Found {len(patches)} patches to apply")
    
    if interactive:
        log_info("🔍 Interactive mode enabled - will ask for confirmation before each patch")
    
    # Apply each patch
    for i, patch_path in enumerate(patches, 1):
        if not patch_path.exists():
            log_info(f"⚠️  Patch file not found: {patch_path}")
            continue
        
        if interactive:
            # Show patch info and ask for confirmation
            log_info(f"\n{'='*60}")
            log_info(f"Patch {i}/{len(patches)}: {patch_path.name}")
            log_info(f"{'='*60}")
            
            while True:
                choice = input("\nOptions:\n  1) Apply this patch\n  2) Skip this patch\n  3) Stop patching here\nEnter your choice (1-3): ").strip()
                
                if choice == "1":
                    apply_single_patch(patch_path, ctx.chromium_src, i, len(patches))
                    break
                elif choice == "2":
                    log_warning(f"⏭️  Skipping patch {patch_path.name}")
                    break
                elif choice == "3":
                    log_info("Stopping patch process as requested")
                    return True
                else:
                    log_error("Invalid choice. Please enter 1, 2, or 3.")
        else:
            apply_single_patch(patch_path, ctx.chromium_src, i, len(patches))
    
    log_success("Patches applied")
    return True




def parse_series_file(patches_dir: Path) -> Iterator[Path]:
    """Parse the series file to get list of patches"""
    series_file = patches_dir / "series"
    
    # Read series file
    with series_file.open('r') as f:
        lines = f.read().splitlines()
    
    patches = []
    for line in lines:
        # Skip empty lines and comments
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        # Remove inline comments
        if ' #' in line:
            line = line.split(' #')[0].strip()
        patches.append(patches_dir / line)
    
    return patches


def apply_single_patch(patch_path: Path, tree_path: Path, current_num: int, total: int) -> bool:
    """Apply a single patch using git apply"""
    # Use git apply which is cross-platform and handles patch format better
    cmd = [
        'git', 'apply',
        '--ignore-whitespace',
        '--whitespace=nowarn',
        '-p1',
        str(patch_path)
    ]
    
    log_info(f"  * Applying {patch_path.name} ({current_num}/{total})")
    
    # Run from the tree_path directory
    result = subprocess.run(cmd, text=True, capture_output=True, cwd=tree_path)
    
    if result.returncode == 0:
        return True
    
    # Patch failed - try with --3way for better conflict resolution
    log_warning(f"Standard apply failed, trying 3-way merge for {patch_path.name}")
    cmd.append('--3way')
    result = subprocess.run(cmd[:-1] + ['--3way', str(patch_path)], text=True, capture_output=True, cwd=tree_path)
    
    if result.returncode == 0:
        log_info(f"✓ Applied {patch_path.name} with 3-way merge")
        return True
    
    # Patch still failed
    log_error(f"Failed to apply patch: {patch_path.name}")
    if result.stderr:
        log_error(f"Error: {result.stderr}")
    
    # Interactive prompt for handling failure
    log_error("\n============================================")
    log_error(f"Patch {patch_path.name} failed to apply.")
    log_info("Options:")
    log_info("  1) Skip this patch and continue")
    log_info("  2) Retry this patch")
    log_info("  3) Abort patching")
    log_info("  4) Interactive mode - Fix manually and continue")
    
    while True:
        choice = input("Enter your choice (1-4): ").strip()
        
        if choice == "1":
            log_warning(f"⏭️  Skipping patch {patch_path.name}")
            return True  # Continue with next patch
        elif choice == "2":
            return apply_single_patch(patch_path, tree_path, current_num, total)
        elif choice == "3":
            log_error("Aborting patch process")
            raise RuntimeError("Patch process aborted by user")
        elif choice == "4":
            log_info("\nPlease fix the issue manually, then press Enter to continue...")
            input("Press Enter when ready: ")
            # Retry after manual fix
            return apply_single_patch(patch_path, tree_path, current_num, total)
