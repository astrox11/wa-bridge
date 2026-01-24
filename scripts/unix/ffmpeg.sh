#!/bin/bash

if command -v ffmpeg &> /dev/null; then
    ffmpeg -version | head -n 1
    exit 0
fi

sudo apt update
sudo apt install -y ffmpeg

if [ $? -eq 0 ]; then
    echo "FFmpeg installed successfully."
else
    echo "Installation failed."
    exit 1
fi