#!/bin/bash
echo "Fixing build directory permissions..."
chmod -R 777 /Users/expo/workingdir/build/.expo 2>/dev/null || true
mkdir -p /Users/expo/workingdir/build/.expo/web 2>/dev/null || true
chmod -R 777 /Users/expo/workingdir/build/.expo/web 2>/dev/null || true
echo "Permissions fixed."
