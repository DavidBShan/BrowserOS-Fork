#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOURCES_DIR="$(dirname "$SCRIPT_DIR")/../resources"
ICONS_DIR="$RESOURCES_DIR/icons"
MAC_DIR="$ICONS_DIR/mac"
ASSETS_DIR="$MAC_DIR/Assets.xcassets"
APPICONSET_DIR="$ASSETS_DIR/AppIcon.appiconset"
ICONSET_DIR="$ASSETS_DIR/Icon.iconset"

SOURCE_ICON="$ICONS_DIR/product_logo_1024.png"

if [[ ! -f "$SOURCE_ICON" ]]; then
    echo "Error: Source icon not found: $SOURCE_ICON"
    exit 1
fi

echo "Generating macOS icons from: $SOURCE_ICON"

mkdir -p "$APPICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Generate AppIcon.appiconset PNGs
echo "Generating AppIcon.appiconset..."
for size in 16 32 64 128 256 512 1024; do
    output="$APPICONSET_DIR/appicon_${size}.png"
    echo "  Creating ${size}x${size}..."
    sips -z $size $size "$SOURCE_ICON" --out "$output" >/dev/null
done

# Generate Icon.iconset PNGs (for .icns generation)
echo "Generating Icon.iconset..."
sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null

# Create Contents.json for Assets.xcassets root
cat > "$ASSETS_DIR/Contents.json" << 'EOF'
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

# Create Contents.json for AppIcon.appiconset
cat > "$APPICONSET_DIR/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "appicon_16.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "16x16"
    },
    {
      "filename" : "appicon_32.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "16x16"
    },
    {
      "filename" : "appicon_32.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "32x32"
    },
    {
      "filename" : "appicon_64.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "32x32"
    },
    {
      "filename" : "appicon_128.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "128x128"
    },
    {
      "filename" : "appicon_256.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "128x128"
    },
    {
      "filename" : "appicon_256.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "256x256"
    },
    {
      "filename" : "appicon_512.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "256x256"
    },
    {
      "filename" : "appicon_512.png",
      "idiom" : "mac",
      "scale" : "1x",
      "size" : "512x512"
    },
    {
      "filename" : "appicon_1024.png",
      "idiom" : "mac",
      "scale" : "2x",
      "size" : "512x512"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
EOF

# Generate app.icns from Icon.iconset
echo "Generating app.icns..."
iconutil -c icns "$ICONSET_DIR" -o "$MAC_DIR/app.icns"

# Generate Assets.car using actool
echo "Generating Assets.car..."
xcrun actool --compile "$MAC_DIR" "$ASSETS_DIR" \
    --platform macosx \
    --minimum-deployment-target 10.15 \
    --app-icon AppIcon \
    --output-partial-info-plist /dev/null

echo "Done! Generated:"
echo "  - $MAC_DIR/app.icns"
echo "  - $MAC_DIR/Assets.car"
