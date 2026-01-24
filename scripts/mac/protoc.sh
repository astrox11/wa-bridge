#!/bin/bash

if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Please install Homebrew first."
    exit 1
fi

if command -v protoc &> /dev/null; then
    echo "Protoc is already installed."
    protoc --version
    exit 0
fi

echo "Installing Protocol Buffers (protoc)..."
brew install protobuf

if [ $? -eq 0 ]; then
    echo "Protoc installation successful."
    protoc --version
else
    echo "Installation failed."
    exit 1
fi