#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'EOF'
Uso:
  ./run.sh serve        Inicia servidor HTTP local (puerto 8000)
  ./run.sh scrape       Ejecuta scraper.py
  ./run.sh all          Ejecuta scraper.py y luego inicia el servidor

Notas:
  - Requiere bash (por ejemplo Git Bash en Windows).
  - El servidor queda en primer plano; Ctrl+C para detener.
EOF
}

command="${1:-}"

case "$command" in
  serve)
    python -m http.server 8000
    ;;
  scrape)
    python scraper.py
    ;;
  all)
    python scraper.py
    python -m http.server 8000
    ;;
  -h|--help|help|"")
    show_help
    ;;
  *)
    echo "Comando desconocido: $command" >&2
    show_help
    exit 1
    ;;
esac
