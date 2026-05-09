@echo off
setlocal enabledelayedexpansion

set "PROJECT_DIR=%cd%"
for %%I in ("%PROJECT_DIR%") do set "PROJECT_NAME=%%~nxI"
for %%I in ("%PROJECT_DIR%\..") do set "PARENT_DIR=%%~fI"

set "ZIP_PATH=%PARENT_DIR%\%PROJECT_NAME%-for-gpt.zip"
set "TEMP_DIR=%TEMP%\%PROJECT_NAME%-for-gpt"

echo Membuat ZIP React: %ZIP_PATH%
echo.

if exist "%ZIP_PATH%" del "%ZIP_PATH%"
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"

mkdir "%TEMP_DIR%"

if exist "src" robocopy "src" "%TEMP_DIR%\src" /E >nul
if exist "public" robocopy "public" "%TEMP_DIR%\public" /E >nul

for %%F in (
    package.json
    package-lock.json
    pnpm-lock.yaml
    yarn.lock
    index.html
    vite.config.js
    vite.config.ts
    tailwind.config.js
    tailwind.config.ts
    postcss.config.js
    postcss.config.cjs
    eslint.config.js
    .eslintrc
    .eslintrc.json
    .prettierrc
    jsconfig.json
    tsconfig.json
    tsconfig.app.json
    tsconfig.node.json
    README.md
    .env.example
) do (
    if exist "%%F" copy "%%F" "%TEMP_DIR%\" >nul
)

cd /d "%TEMP_DIR%"
tar -a -cf "%ZIP_PATH%" *

cd /d "%PROJECT_DIR%"
rmdir /s /q "%TEMP_DIR%"

if exist "%ZIP_PATH%" (
    echo.
    echo Selesai.
    echo File ZIP tersimpan di:
    echo %ZIP_PATH%
) else (
    echo.
    echo Gagal membuat ZIP.
)

pause