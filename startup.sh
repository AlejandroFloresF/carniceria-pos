#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/Carniceria.API"
UI_DIR="$ROOT_DIR/carniceria-pos"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}       Carniceria - Startup Script      ${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# ── Git pull: API ─────────────────────────────────────────
echo -e "${GREEN}[1/4] Pulling latest changes for API...${NC}"
cd "$API_DIR"
if git pull; then
    echo -e "${GREEN}      API: up to date.${NC}"
else
    echo -e "${RED}      API: git pull failed (continuing anyway).${NC}"
fi
echo ""

# ── Git pull: UI ──────────────────────────────────────────
echo -e "${GREEN}[2/4] Pulling latest changes for UI...${NC}"
cd "$UI_DIR"
if git pull; then
    echo -e "${GREEN}      UI: up to date.${NC}"
else
    echo -e "${RED}      UI: git pull failed (continuing anyway).${NC}"
fi
echo ""

# ── Restore .NET dependencies ─────────────────────────────
echo -e "${GREEN}[3/4] Restoring .NET dependencies...${NC}"
cd "$API_DIR"
dotnet restore
echo ""

# ── Install npm dependencies ──────────────────────────────
echo -e "${GREEN}[4/4] Installing npm dependencies...${NC}"
cd "$UI_DIR"
npm install
echo ""

# ── Launch both projects in separate windows ──────────────
echo -e "${YELLOW}Starting API and UI in separate windows...${NC}"
echo ""

GITBASH="C:/Program Files/Git/bin/bash.exe"
if [ ! -f "$GITBASH" ]; then
    GITBASH="C:/Program Files (x86)/Git/bin/bash.exe"
fi

# Launch API window
start "" "$GITBASH" --login -i -c "
  cd '$API_DIR/Carniceria.API' &&
  echo '' &&
  echo '  [Carniceria API]  dotnet run' &&
  echo '' &&
  dotnet run;
  echo '';
  echo 'Press any key to close...';
  read -n 1
"

# Launch UI window
start "" "$GITBASH" --login -i -c "
  cd '$UI_DIR' &&
  echo '' &&
  echo '  [Carniceria UI]  npm run dev' &&
  echo '' &&
  npm run dev;
  echo '';
  echo 'Press any key to close...';
  read -n 1
"

# ── Auto-open browser when apps are ready ────────────────
echo -e "${YELLOW}Waiting for apps to be ready, then browser will open...${NC}"

# Open UI when localhost:5173 responds
(
  until curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 1; done
  echo -e "${GREEN}UI is ready — opening browser...${NC}"
  cmd.exe /c start "" "http://localhost:5173"
) &

# Open API Swagger when localhost:5049 responds
(
  until curl -s http://localhost:5049 > /dev/null 2>&1; do sleep 1; done
  echo -e "${GREEN}API is ready — opening Swagger...${NC}"
  cmd.exe /c start "" "http://localhost:5049/swagger"
) &

echo -e "${GREEN}Both projects launched. You can close this window.${NC}"
echo ""
read -n 1 -s -r -p "Press any key to exit..."
