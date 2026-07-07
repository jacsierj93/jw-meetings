#!/bin/bash
# Initialization script for the JW Meeting Backend

set -e

echo "🚀 Inicializando JW Meeting Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde .env.example..."
    cp .env.example .env
    echo "✅ Archivo .env creado"
else
    echo "✅ Archivo .env ya existe"
fi

# Build and start containers
echo "🐳 Construyendo contenedores Docker..."
docker-compose build

echo "🐳 Levantando servicios..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# Run migrations
echo "🗄️  Ejecutando migraciones de base de datos..."
docker-compose exec -T api alembic upgrade head

echo ""
echo "✅ ¡Inicialización completada!"
echo ""
echo "📚 Servicios disponibles:"
echo "  - API: http://localhost:8000"
echo "  - Docs: http://localhost:8000/docs"
echo "  - Health: http://localhost:8000/health"
echo ""
echo "🛠️  Comandos útiles:"
echo "  - Ver logs: docker-compose logs -f api"
echo "  - Ejecutar tests: docker-compose exec api pytest"
echo "  - Detener: docker-compose down"
echo ""
