#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Conda environment name
CONDA_ENV_NAME="myenv"

# Conda activation (modify this if you use a different conda environment)
if [ -z "$CONDA_PREFIX" ]; then
    echo "Activation conda enviroment: $CONDA_ENV_NAME"
    source "$(conda info --base)/etc/profile.d/conda.sh"
    conda activate "$CONDA_ENV_NAME"
else
    echo "Conda already activated: $CONDA_PREFIX"
fi

# Python package installation
echo "Python package installation..."
pip install -r requirements.txt

# Download spaCy model
echo "Download spaCy model (en_core_web_trf)..."
python -m spacy download en_core_web_trf

# Installation frontend dependencies
echo "Installation frontend dependencies..."
cd frontend
npm install
cd ..

echo "Setup completed!"
