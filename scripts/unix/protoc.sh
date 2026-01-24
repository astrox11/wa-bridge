#!/bin/bash

if command -v protoc &> /dev/null; then
    protoc --version
    exit 0
fi

sudo apt update
sudo apt install -y protobuf-compiler

if [ $? -eq 0 ]; then
    echo "Protoc installed successfully."
    protoc --version
else
    echo "Installation failed."
    exit 1
fi