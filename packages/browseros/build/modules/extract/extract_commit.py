"""
Extract Commit - Extract patches from a single git commit.
"""

from pathlib import Path
from typing import Optional

from ...common.context import Context
from ...common.module import CommandModule, ValidationError
from ...common.utils import log_info, log_success, log_warning
from .utils import (
    GitError,
    validate_git_repository,
    validate_commit_exists,
    get_commit_info,
)
from .common import extract_normal, extract_with_base


def extract_single_commit(
    ctx: Context,
    commit_hash: str,
    verbose: bool = False,
    force: bool = False,
    include_binary: bool = False,
    base: Optional[str] = None,
) -> int:
    """Extract patches from a single commit

    Args:
        ctx: Build context
        commit_hash: Commit to extract
        verbose: Show detailed output
        force: Overwrite existing patches
        include_binary: Include binary files
        base: If provided, extract full diff from base for files in commit

    Returns:
        Number of patches successfully extracted
    """
    # Step 1: Validate commit
    if not validate_commit_exists(commit_hash, ctx.chromium_src):
        raise GitError(f"Commit not found: {commit_hash}")

    # Get commit info for logging
    commit_info = get_commit_info(commit_hash, ctx.chromium_src)
    if commit_info and verbose:
        log_info(
            f"  Author: {commit_info['author_name']} <{commit_info['author_email']}>"
        )
        log_info(f"  Subject: {commit_info['subject']}")

    if base:
        # With --base: Get files from commit, but diff from base
        return extract_with_base(ctx, commit_hash, base, verbose, force, include_binary)
    else:
        # Normal behavior: diff against parent
        return extract_normal(ctx, commit_hash, verbose, force, include_binary)


class ExtractCommitModule(CommandModule):
    """Extract patches from a single commit"""
    produces = []
    requires = []
    description = "Extract patches from a single commit"

    def validate(self, ctx: Context) -> None:
        """Validate git repository"""
        import shutil
        if not shutil.which("git"):
            raise ValidationError("Git is not available in PATH")
        if not validate_git_repository(ctx.chromium_src):
            raise ValidationError(f"Not a git repository: {ctx.chromium_src}")

    def execute(
        self,
        ctx: Context,
        commit: str,
        output: Optional[Path] = None,
        interactive: bool = True,
        verbose: bool = False,
        force: bool = False,
        include_binary: bool = False,
        base: Optional[str] = None,
    ) -> None:
        """Execute extract commit

        Args:
            commit: Git commit reference (e.g., HEAD)
            output: Output directory (unused, kept for compatibility)
            interactive: Interactive mode (unused, kept for compatibility)
            verbose: Show detailed output
            force: Overwrite existing patches
            include_binary: Include binary files
            base: Extract full diff from base commit for files in COMMIT
        """
        try:
            count = extract_single_commit(
                ctx,
                commit_hash=commit,
                verbose=verbose,
                force=force,
                include_binary=include_binary,
                base=base,
            )
            if count == 0:
                log_warning(f"No patches extracted from {commit}")
            else:
                log_success(f"Successfully extracted {count} patches from {commit}")
        except GitError as e:
            raise RuntimeError(f"Git error: {e}")
