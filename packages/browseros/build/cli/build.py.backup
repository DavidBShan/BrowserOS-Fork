"""
Build CLI - Main build command

This module uses relative imports and must be run as a module:
    python -m build.cli.build

Or via the installed entry point:
    browseros build
"""
import os
import sys
import time
from pathlib import Path
from typing import Optional, Tuple

import typer

# Import common modules
from ..common.context import BuildContext
from ..common.utils import (
    load_config,
    log_error,
    log_info,
    log_warning,
    log_success,
    IS_MACOS,
    IS_WINDOWS,
    IS_LINUX,
)

# Import build modules
from ..modules.setup.clean import clean
from ..modules.setup.git import setup_git, setup_sparkle
from ..modules.patches.patches import apply_patches
from ..modules.resources.resources import copy_resources
from ..modules.resources.chromium_replace import replace_chromium_files
from ..modules.resources.string_replaces import apply_string_replacements
from ..modules.setup.configure import configure
from ..modules.compile import build as build_step
from ..modules.sign import sign, sign_universal, check_signing_environment
from ..modules.package import package, package_universal
from ..modules.upload import upload_package_artifacts


def main(
    config: Optional[Path] = typer.Option(
        None,
        "--config",
        "-c",
        help="Load configuration from YAML file",
        exists=True,
    ),
    clean_flag: bool = typer.Option(
        False,
        "--clean",
        "-C",
        help="Clean before build",
    ),
    git_setup: bool = typer.Option(
        False,
        "--git-setup",
        "-g",
        help="Git setup",
    ),
    apply_patches_flag: bool = typer.Option(
        False,
        "--apply-patches",
        "-p",
        help="Apply patches",
    ),
    sign_flag: bool = typer.Option(
        False,
        "--sign",
        "-s",
        help="Sign and notarize the app",
    ),
    arch: Optional[str] = typer.Option(
        None,
        "--arch",
        "-a",
        help="Architecture (arm64, x64) - defaults to platform-specific",
    ),
    build_type: str = typer.Option(
        "debug",
        "--build-type",
        "-t",
        help="Build type (debug or release)",
    ),
    package_flag: bool = typer.Option(
        False,
        "--package",
        "-P",
        help="Create package (DMG/AppImage/Installer)",
    ),
    build_flag: bool = typer.Option(
        False,
        "--build",
        "-b",
        help="Build",
    ),
    chromium_src: Optional[Path] = typer.Option(
        None,
        "--chromium-src",
        "-S",
        help="Path to Chromium source directory",
    ),
    slack_notifications: bool = typer.Option(
        False,
        "--slack-notifications",
        "-n",
        help="Enable Slack notifications",
    ),
    merge: Optional[Tuple[str, str]] = typer.Option(
        None,
        "--merge",
        help="Merge two architecture builds: --merge path/to/arch1.app path/to/arch2.app",
        metavar="ARCH1_APP ARCH2_APP",
    ),
    patch_interactive: bool = typer.Option(
        False,
        "--patch-interactive",
        "-i",
        help="Ask for confirmation before applying each patch",
    ),
):
    """Build BrowserOS browser

    Simple build system for BrowserOS. Can run individual steps or full pipeline.
    """

    # Validate chromium-src for commands that need it
    if merge or (not config and chromium_src is None):
        if not chromium_src:
            if merge:
                log_error("--merge requires --chromium-src to be specified")
                log_error(
                    "Example: browseros build --merge app1.app app2.app --chromium-src /path/to/chromium/src"
                )
            else:
                log_error("--chromium-src is required when not using a config file")
                log_error(
                    "Example: browseros build --chromium-src /path/to/chromium/src"
                )
            raise typer.Exit(1)

        # Validate chromium_src path exists
        if not chromium_src.exists():
            log_error(f"Chromium source directory does not exist: {chromium_src}")
            raise typer.Exit(1)

    # Handle merge command
    if merge:
        from ..modules.package.merge import handle_merge_command

        arch1_path, arch2_path = merge
        # Convert strings to Path objects
        arch1_path = Path(arch1_path)
        arch2_path = Path(arch2_path)

        if handle_merge_command(arch1_path, arch2_path, chromium_src, sign_flag, package_flag):
            raise typer.Exit(0)
        else:
            raise typer.Exit(1)

    # Validate arch and build_type choices
    if arch and arch not in ["arm64", "x64"]:
        log_error(f"Invalid architecture: {arch}. Must be 'arm64' or 'x64'")
        raise typer.Exit(1)

    if build_type not in ["debug", "release"]:
        log_error(f"Invalid build type: {build_type}. Must be 'debug' or 'release'")
        raise typer.Exit(1)

    # =============================================================================
    # Main Build Orchestration
    # =============================================================================

    log_info("🚀 BrowserOS Build System")
    log_info("=" * 50)

    # Check signing environment (macOS)
    if sign_flag and IS_MACOS():
        if not check_signing_environment():
            raise typer.Exit(1)

    # Set Windows-specific environment variables
    if IS_WINDOWS():
        os.environ["DEPOT_TOOLS_WIN_TOOLCHAIN"] = "0"
        log_info("🔧 Set DEPOT_TOOLS_WIN_TOOLCHAIN=0 for Windows build")

    # Setup paths
    root_dir = Path(__file__).parent.parent.parent

    # Initialize chromium_src as None - will be set from CLI or config
    chromium_src_path = None
    gn_flags_file = None
    architectures = [arch] if arch else []
    universal = False
    certificate_name = None  # For Windows signing

    # Load config if provided
    if config:
        config_data = load_config(config)
        log_info(f"📄 Loaded config from: {config}")

        # Override parameters from config
        if "build" in config_data:
            build_type = config_data["build"].get("type", build_type)
            arch = config_data["build"].get("architecture", arch)
            # Check for multi-architecture builds
            if "architectures" in config_data["build"]:
                architectures = config_data["build"]["architectures"]
            universal = config_data["build"].get("universal", False)

        if "steps" in config_data:
            clean_flag = config_data["steps"].get("clean", clean_flag)
            git_setup = config_data["steps"].get("git_setup", git_setup)
            apply_patches_flag = config_data["steps"].get("apply_patches", apply_patches_flag)
            build_flag = config_data["steps"].get("build", build_flag)
            sign_flag = config_data["steps"].get("sign", sign_flag)
            package_flag = config_data["steps"].get("package", package_flag)

        # Override slack notifications from config if not explicitly set via CLI
        if "notifications" in config_data:
            slack_notifications = config_data["notifications"].get("slack", slack_notifications)

        if "gn_flags" in config_data and "file" in config_data["gn_flags"]:
            gn_flags_file = Path(config_data["gn_flags"]["file"])

        # Get chromium_src from config (only if not provided via CLI)
        if not chromium_src and "paths" in config_data and "chromium_src" in config_data["paths"]:
            chromium_src_path = Path(config_data["paths"]["chromium_src"])
            log_info(f"📁 Using Chromium source from config: {chromium_src_path}")

        # Get Windows signing certificate name from config
        if IS_WINDOWS() and "signing" in config_data and "certificate_name" in config_data["signing"]:
            certificate_name = config_data["signing"]["certificate_name"]
            log_info(f"🔏 Using certificate for signing: {certificate_name}")

    # CLI takes precedence over config
    if chromium_src:
        chromium_src_path = chromium_src
        log_info(f"📁 Using Chromium source from CLI: {chromium_src_path}")

    # Enforce chromium_src requirement
    if not chromium_src_path:
        log_error("Chromium source directory is required!")
        log_error("Provide it via --chromium-src CLI option or paths.chromium_src in config YAML")
        log_error("Example: browseros build --chromium-src /path/to/chromium/src")
        raise typer.Exit(1)

    # Validate chromium_src path exists
    if not chromium_src_path.exists():
        log_error(f"Chromium source directory does not exist: {chromium_src_path}")
        log_error("Please provide a valid chromium source path")
        raise typer.Exit(1)

    # If no architectures specified, use platform default
    if not architectures:
        from ..common.utils import get_platform_arch
        architectures = [get_platform_arch()]
        log_info(f"📍 Using platform default architecture: {architectures[0]}")

    # Display build configuration
    log_info(f"📍 Root: {root_dir}")
    log_info(f"📍 Chromium source: {chromium_src_path}")
    log_info(f"📍 Architectures: {architectures}")
    log_info(f"📍 Universal build: {universal}")
    log_info(f"📍 Build type: {build_type}")

    # Start time for overall build
    start_time = time.time()

    # Run build steps
    try:
        built_contexts = []

        # Build each architecture separately
        for arch_name in architectures:
            log_info(f"\n{'='*60}")
            log_info(f"🏗️  Building for architecture: {arch_name}")
            log_info(f"{'='*60}")

            ctx = BuildContext(
                root_dir=root_dir,
                chromium_src=chromium_src_path,
                architecture=arch_name,
                build_type=build_type,
            )

            log_info(f"📍 Chromium: {ctx.chromium_version}")
            log_info(f"📍 BrowserOS: {ctx.browseros_version}")
            log_info(f"📍 Output directory: {ctx.out_dir}")

            # Clean (only for first architecture to avoid conflicts)
            if clean_flag and arch_name == architectures[0]:
                clean(ctx)

            # Git setup (only once for first architecture)
            if git_setup and arch_name == architectures[0]:
                setup_git(ctx)

            # Apply patches (only once for first architecture)
            if apply_patches_flag and arch_name == architectures[0]:
                # First do chromium file replacements
                replace_chromium_files(ctx)

                # Then apply string replacements
                apply_string_replacements(ctx)

                # Setup sparkle (macOS only)
                if IS_MACOS():
                    setup_sparkle(ctx)
                else:
                    log_info("Skipping Sparkle setup (macOS only)")

                # Apply patches
                apply_patches(ctx, interactive=patch_interactive, commit_each=False)

            # Copy resources for each architecture (YAML filters by arch)
            if apply_patches_flag:
                copy_resources(ctx, commit_each=False)

            # Build for this architecture
            if build_flag:
                configure(ctx, gn_flags_file)
                build_step(ctx)

            # Sign and package immediately after building each architecture
            if sign_flag:
                log_info(f"\n🔏 Signing {ctx.architecture} build...")
                # Pass certificate_name for Windows signing
                if IS_WINDOWS():
                    sign(ctx, certificate_name)
                else:
                    sign(ctx)

            if package_flag:
                log_info(f"\n📦 Packaging {ctx.architecture} build...")
                package(ctx)

                # Upload to GCS after packaging
                upload_package_artifacts(ctx)

            built_contexts.append(ctx)

        # Handle universal build if requested
        if len(architectures) > 1 and universal:
            # Universal build: merge, sign and package
            log_info(f"\n{'='*60}")
            log_info("🔄 Creating universal binary...")
            log_info(f"{'='*60}")

            # Import merge function
            from ..modules.package.merge import merge_architectures

            # Get paths for the built apps
            arch1_app = built_contexts[0].get_app_path()
            arch2_app = built_contexts[1].get_app_path()

            # Clean up old universal output directory if it exists
            universal_dir = built_contexts[0].chromium_src / "out/Default_universal"
            if universal_dir.exists():
                log_info("🧹 Cleaning up old universal output directory...")
                from ..common.utils import safe_rmtree
                safe_rmtree(universal_dir)

            # Create fresh universal output path
            universal_dir.mkdir(parents=True, exist_ok=True)
            universal_app_path = universal_dir / built_contexts[0].BROWSEROS_APP_NAME

            # Find universalizer script
            universalizer_script = root_dir / "build" / "modules" / "package" / "universalizer_patched.py"

            # Merge the architectures
            if not merge_architectures(
                arch1_app, arch2_app, universal_app_path, universalizer_script
            ):
                raise RuntimeError("Failed to merge architectures into universal binary")

            if sign_flag:
                sign_universal(built_contexts)

            if package_flag:
                package_universal(built_contexts)

                # Upload universal package to GCS
                # Use the first context with universal architecture override
                universal_ctx = built_contexts[0]
                original_arch = universal_ctx.architecture
                universal_ctx.architecture = "universal"
                upload_package_artifacts(universal_ctx)
                universal_ctx.architecture = original_arch

        # Summary
        elapsed = time.time() - start_time
        mins = int(elapsed / 60)
        secs = int(elapsed % 60)

        log_info("\n" + "=" * 60)
        log_success(
            f"Build completed for {len(architectures)} architecture(s) in {mins}m {secs}s"
        )
        if universal and len(architectures) > 1:
            log_success("Universal binary created successfully!")
        log_info("=" * 60)

    except KeyboardInterrupt:
        log_warning("\nBuild interrupted")
        raise typer.Exit(130)
    except Exception as e:
        log_error(f"\nBuild failed: {e}")
        raise typer.Exit(1)
