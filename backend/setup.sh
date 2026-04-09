#!/bin/bash

# Setup script for CO Attainment Automation Backend

echo "========================================"
echo "CO Attainment Backend Setup"
echo "========================================"
echo ""

# Check Python version
echo "1. Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Found Python $PYTHON_VERSION"
echo ""

# Check for Tesseract
echo "2. Checking Tesseract OCR..."
if ! command -v tesseract &> /dev/null; then
    echo "⚠ Tesseract OCR not found (optional, but required for DOCX image extraction)"
    echo "   Install it:"
    echo "   Linux:   sudo apt install tesseract-ocr"
    echo "   macOS:   brew install tesseract"
    echo "   Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
else
    TESSERACT_VERSION=$(tesseract --version 2>&1 | head -1)
    echo "✓ $TESSERACT_VERSION"
fi
echo ""

# Create virtual environment
echo "3. Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "4. Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Install Python dependencies
echo "5. Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Verify installations
echo "6. Verifying installations..."
python3 -c "import docx; print('✓ python-docx')" || exit 1
python3 -c "import pandas; print('✓ pandas')" || exit 1
python3 -c "import openpyxl; print('✓ openpyxl')" || exit 1
python3 -c "import pytesseract; print('✓ pytesseract')" || exit 1
python3 -c "import PIL; print('✓ Pillow')" || exit 1
echo ""

echo "========================================"
echo "✓ Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. To activate the environment in future terminals:"
echo "   source venv/bin/activate"
echo ""
echo "2. To test a stage:"
echo "   python3 stage1_qp.py '{\"docx_path\": \"test.docx\", \"output_path\": \"out.xlsx\"}'"
echo ""
echo "3. For Node.js integration, see INTEGRATION_GUIDE.js"
echo ""
