#!/bin/bash

if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

if command -v ffmpeg &> /dev/null; then
    echo "FFmpeg is already installed."
    ffmpeg -version | head -n 1
    exit 0
fi

echo "Installing FFmpeg..."
brew install ffmpeg

if [ $? -eq 0 ]; then
    echo "FFmpeg installation successful."
else
    echo "Installation failed."
    exit 1
fi