# Chromium Replace with Build Type Support

The chromium_replace module now supports build-type specific file replacements using `.debug` and `.release` suffixes.

## How it works

1. **Build-type specific files**: Files with `.debug` or `.release` suffixes are only used for their respective build types
2. **Automatic suffix removal**: The `.debug`/`.release` suffix is removed when copying to chromium source
3. **Priority system**: Build-type specific files take precedence over generic files

## Examples

### Example 1: BRANDING file with debug/release variants

Your repo structure:
```
chromium_src/
  chrome/app/theme/chromium/
    BRANDING.debug      # Used for debug builds
    BRANDING.release    # Used for release builds
```

When building:
- Debug build: `BRANDING.debug` → `chrome/app/theme/chromium/BRANDING`
- Release build: `BRANDING.release` → `chrome/app/theme/chromium/BRANDING`

### Example 2: Mixed generic and build-specific files

Your repo structure:
```
chromium_src/
  chrome/
    common_file.cc      # Used for both debug and release
    config.gni          # Generic version (used if no build-specific version exists)
    config.gni.debug    # Debug-specific (takes precedence over generic for debug builds)
    config.gni.release  # Release-specific (takes precedence over generic for release builds)
```

When building debug:
- `common_file.cc` → `chrome/common_file.cc`
- `config.gni.debug` → `chrome/config.gni` (generic `config.gni` is skipped)

### Example 3: File with only one build variant

Your repo structure:
```
chromium_src/
  chrome/
    feature.cc          # Generic version
    feature.cc.debug    # Debug-only variant
```

When building:
- Debug build: Uses `feature.cc.debug` → `chrome/feature.cc`
- Release build: Uses `feature.cc` → `chrome/feature.cc`

## Usage

Just place your files in the `chromium_src/` directory with appropriate suffixes:
- No suffix: Used for all build types (unless a specific variant exists)
- `.debug` suffix: Only used for debug builds
- `.release` suffix: Only used for release builds

The build system automatically selects the right file based on your build type!