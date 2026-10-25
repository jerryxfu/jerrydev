#!/bin/sh
# Sends a file to Expedite (https://jerryxf.net/expedite) from a terminal, at any size up to 16 GB:
#
#   curl -fsSL https://jerryxf.net/expedite.sh | sh -s <file>
#
# Up to 32 MB, the file goes to the API in one request. A bigger one can't (Cloud Run takes 32 MB at most): the API
# opens the drop and signs an upload link per 100 MB part, each part goes straight to storage, then the API checks the
# whole file. The drop lasts 12 hours, has no view limit, and its recipient can delete it.
set -eu

api=https://api.jerryxf.net/expedite/raw
file=${1:-}

if [ ! -f "$file" ]; then
    echo "Usage: curl -fsSL https://jerryxf.net/expedite.sh | sh -s <file>" >&2
    exit 1
fi

size=$(wc -c < "$file" | tr -d ' ')
if [ "$size" -le 32000000 ]; then
    exec curl -sS -T "$file" "$api/"
fi

# Asks the API (curl's arguments), prints its answer, and stops there when it says no.
ask() {
    answer=$(curl -sS -w '\n%{http_code}' "$@")
    status=$(printf '%s\n' "$answer" | tail -n 1)
    answer=$(printf '%s\n' "$answer" | sed '$d')
    case $status in
        2*) ;;
        *) printf '%s\n' "$answer" >&2; exit 1 ;;
    esac
}

# The SHA-256, for the receiver's hash check. Left out when the system has no tool for it.
echo "Computing its SHA-256..." >&2
sha=$( (shasum -a 256 "$file" || sha256sum "$file") 2>/dev/null | cut -c1-64) || sha=""

ask --data-urlencode "name=$(basename "$file")" -d "size=$size" "$api/start"
code=$(printf '%s\n' "$answer" | sed -n 1p)
type=$(printf '%s\n' "$answer" | sed -n 2p)
links=$(printf '%s\n' "$answer" | sed -n '3,$p')
count=$(printf '%s\n' "$links" | wc -l | tr -d ' ')

# A part per link, read 100 MB at a time (the API's PART_SIZE). The links hold ? and &: no globbing.
set -f
i=0
etags=""
for link in $links; do
    i=$((i + 1))
    echo "Part $i of $count" >&2
    headers=$(dd if="$file" bs=1048576 skip=$(((i - 1) * 100)) count=100 2>/dev/null |
        curl --progress-bar -X PUT -H "Content-Type: $type" --data-binary @- -D - -o /dev/null "$link")
    etag=$(printf '%s\n' "$headers" | sed -n 's/^[Ee][Tt][Aa][Gg]: *//p' | tr -d '\r')
    if [ -z "$etag" ]; then
        echo "Part $i didn't go through. Try again." >&2
        exit 1
    fi
    etags="$etags
$etag"
done
set +f

ask --data-binary @- "$api/$code/done" <<EOF
$sha$etags
EOF
printf '%s\n' "$answer"
