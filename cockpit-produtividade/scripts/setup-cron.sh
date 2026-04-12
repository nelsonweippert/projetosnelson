#!/bin/bash
# Setup cron job for idea-agent
# Roda todo dia às 8h

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_PATH="$HOME/.local/node/bin"

# Cron entry
CRON_CMD="0 8 * * * export PATH=$NODE_PATH:\$PATH && cd $PROJECT_DIR && npx tsx scripts/idea-agent.ts >> /tmp/idea-agent.log 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "idea-agent"; then
  echo "⚠️  Cron já está configurado. Removendo anterior..."
  crontab -l | grep -v "idea-agent" | crontab -
fi

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "✅ Cron configurado!"
echo "   Horário: todo dia às 8h"
echo "   Log: /tmp/idea-agent.log"
echo "   Projeto: $PROJECT_DIR"
echo ""
echo "Para verificar: crontab -l"
echo "Para remover: crontab -l | grep -v idea-agent | crontab -"
echo "Para rodar agora: npm run agent:ideas"
