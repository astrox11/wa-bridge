#!/bin/bash

cd "$(dirname "$0")/service" || {  exit 1; }

# Supports Linux and MacOS
cargo run --release
