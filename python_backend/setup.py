#!/usr/bin/env python3
"""
Setup script for LaTeX Resume Editor Python Backend
"""

import subprocess
import sys
import os

def install_requirements():
    """Install Python requirements"""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Requirements installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing requirements: {e}")
        return False
    return True

def check_latex_installation():
    """Check if LuaLaTeX is installed"""
    print("Checking LuaLaTeX installation...")
    try:
        result = subprocess.run(['lualatex', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ LuaLaTeX is installed")
            return True
        else:
            print("❌ LuaLaTeX is not installed")
            return False
    except FileNotFoundError:
        print("❌ LuaLaTeX is not installed")
        print("\nTo install LuaLaTeX:")
        print("  - macOS: brew install basictex")
        print("  - Ubuntu: sudo apt-get install texlive-full")
        print("  - Windows: Install MiKTeX or TeX Live")
        print("\nNote: LuaLaTeX comes with most modern LaTeX distributions")
        return False

def create_env_file():
    """Create .env file template"""
    env_file = ".env"
    if not os.path.exists(env_file):
        print("Creating .env file template...")
        with open(env_file, "w") as f:
            f.write("# LaTeX Resume Editor Backend Configuration\n")
            f.write("# Replace with your actual Gemini API key\n")
            f.write("GEMINI_API_KEY=your-api-key-here\n")
        print("✅ Created .env file template")
        print("⚠️  Please update .env with your actual Gemini API key")
    else:
        print("✅ .env file already exists")

def main():
    """Main setup function"""
    print("🚀 Setting up LaTeX Resume Editor Python Backend")
    print("=" * 50)
    
    # Install requirements
    if not install_requirements():
        print("❌ Setup failed during requirements installation")
        return
    
    # Check LuaLaTeX installation
    if not check_latex_installation():
        print("⚠️  LuaLaTeX is not installed. PDF generation will not work.")
        print("   You can still use the AI parsing features.")
        print("\n   LuaLaTeX provides better font support and modern LaTeX features.")
    
    # Create environment file
    create_env_file()
    
    print("\n✅ Setup completed!")
    print("\nNext steps:")
    print("1. Update .env file with your Gemini API key")
    print("2. Run: python app.py")
    print("3. The backend will be available at http://localhost:5000")

if __name__ == "__main__":
    main() 