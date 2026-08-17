#!/bin/bash

# Create necessary directories
mkdir -p public/media/source
mkdir -p public/media/clips
mkdir -p public/media/posters
mkdir -p public/media/pano
mkdir -p public/media/plans

echo "Starting encode process..."

# 1. Encode video clips (1920px wide, H.264, no audio)
for file in public/media/source/*.mp4; do
  if [ -f "$file" ]; then
    filename=$(basename -- "$file")
    name="${filename%.*}"
    echo "Encoding video: $name"
    ffmpeg -y -i "$file" -vf "scale=1920:-2" -c:v libx264 -crf 23 -g 15 -movflags +faststart -an "public/media/clips/$name.mp4"
  fi
done

# 2. Extract posters
# Poster for inbound clips (extracted from LAST frame)
for file in public/media/clips/*_in.mp4; do
  if [ -f "$file" ]; then
    filename=$(basename -- "$file")
    name="${filename%_in.mp4}"
    echo "Extracting poster for: $name"
    ffmpeg -y -sseof -0.1 -i "$file" -vframes 1 -q:v 2 "public/media/posters/$name.jpg"
  fi
done

# Hub poster (extracted from FIRST frame of any outbound clip, e.g., hub_to_entrance.mp4)
if [ -f "public/media/clips/hub_out.mp4" ]; then
  echo "Extracting hub poster"
  ffmpeg -y -i "public/media/clips/hub_out.mp4" -vframes 1 -q:v 2 "public/media/posters/hub.jpg"
fi

# 3. Resize Panoramas to 4096x2048
for file in public/media/source/*.jpg; do
  if [ -f "$file" ]; then
    filename=$(basename -- "$file")
    name="${filename%.*}"
    if [[ "$name" == pano_* ]]; then
      echo "Resizing panorama: $name"
      ffmpeg -y -i "$file" -vf "scale=4096:2048" "public/media/pano/$name.jpg"
    fi
  fi
done

echo "Encode process complete!"
echo "---------------------------------"
echo "Folder sizes:"
du -sh public/media/clips || echo "0"
du -sh public/media/posters || echo "0"
du -sh public/media/pano || echo "0"
du -sh public/media/plans || echo "0"
echo "---------------------------------"
echo "NOTE: Ensure that the public/media/clips folder stays under 25 MB total for six points."
