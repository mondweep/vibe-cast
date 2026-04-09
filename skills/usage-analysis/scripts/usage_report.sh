#!/bin/bash

# Usage Analysis Helper Script
# Wraps token_analysis.py for easier usage

# Set working directory to the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT" || exit

# Run the python script with any passed environment variables
python3 token_analysis.py
