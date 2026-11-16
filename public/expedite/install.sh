#!/bin/sh
# Installs the Expedite CLI (https://jerryxf.net/expedite) on macOS or Linux, or updates it:
#
#   curl -fsSL https://jerryxf.net/expedite/install.sh | sh
#
# It fetches the latest release for this system from GitHub (https://github.com/jerryxfu/expedite-cli), checks it
# against the release's checksums, and puts `expedite` in ~/.local/bin, or in $EXPEDITE_DIR when it's set.
set -eu

# In a function, called on the last line: a script cut short on its way here runs nothing.
main() {
    release=https://github.com/jerryxfu/expedite-cli/releases/latest/download
    dir=${EXPEDITE_DIR:-$HOME/.local/bin}

    case $(uname -s) in
        Darwin) os=darwin ;;
        Linux) os=linux ;;
        *)
            echo "This script is for macOS and Linux. On Windows: irm https://jerryxf.net/expedite/install.ps1 | iex" >&2
            exit 1
            ;;
    esac
    case $(uname -m) in
        x86_64 | amd64) arch=amd64 ;;
        arm64 | aarch64) arch=arm64 ;;
        *)
            echo "There's no build of expedite for this processor ($(uname -m))." >&2
            exit 1
            ;;
    esac

    archive=expedite_${os}_${arch}.tar.gz
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' EXIT

    echo "Downloading expedite for $os $arch..." >&2
    curl -fsSL -o "$tmp/$archive" "$release/$archive"
    curl -fsSL -o "$tmp/checksums.txt" "$release/checksums.txt"

    # The archive's SHA-256, against the release's list. Skipped when the system has no tool for it.
    want=$(grep " $archive\$" "$tmp/checksums.txt" | cut -d ' ' -f 1)
    got=$( (shasum -a 256 "$tmp/$archive" || sha256sum "$tmp/$archive") 2>/dev/null | cut -d ' ' -f 1) || got=""
    if [ -z "$got" ]; then
        echo "No tool here to check the download (shasum, sha256sum). Installing without the check." >&2
    elif [ "$got" != "$want" ]; then
        echo "The download doesn't match the release's checksum. Nothing was installed." >&2
        exit 1
    fi

    tar -xzf "$tmp/$archive" -C "$tmp" expedite
    mkdir -p "$dir"
    # Moved into place in one step, so an expedite that's running keeps its own file.
    chmod 755 "$tmp/expedite"
    mv -f "$tmp/expedite" "$dir/expedite"

    echo "Installed expedite $("$dir/expedite" version) in $dir." >&2
    case ":$PATH:" in
        *":$dir:"*) ;;
        *)
            echo "$dir isn't in your PATH. Add this line to your shell's profile:" >&2
            echo "  export PATH=\"$dir:\$PATH\"" >&2
            ;;
    esac
}

main
