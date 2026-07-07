# JW Meeting System - Backend

Sistema de gestión de programas de reuniones semanales con extracción automática desde EPUB y gestión de asignaciones.

## Características

- 📚 Extracción automática de programas desde archivos EPUB
- 👥 Gestión de asignaciones con histórico
- 🔄 Servicio de asignaciones genérico y reutilizable
- 🗄️ Persistencia completa de contenido descriptivo
- 🐳 Entorno de desarrollo dockerizado

## Stack Tecnológico

- **Python 3.12**
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy 2.0** - ORM con soporte async
- **PostgreSQL 16** - Base de datos relacional
- **Alembic** - Migraciones de base de datos
- **Docker & Docker Compose** - Contenedores para desarrollo

## Arquitectura

El proyecto sigue **Clean Architecture** con separación en módulos:

- `scraper/` - Extracción y parsing de EPUB (aislado)
- `assignments/` - Gestión genérica de asignaciones (reutilizable)
- `program/` - Lógica específica del programa de reuniones

## Requisitos Previos

- Docker Desktop (Windows) o Docker Engine + Docker Compose (Linux)
- Git

## Inicio Rápido

### Opción 1: Script de Inicialización (Recomendado)

**Windows:**
```bash
init.bat
```

**Linux/Mac:**
```bash
chmod +x init.sh
./init.sh
```

### Opción 2: Manual

#### 1. Copiar variables de entorno
```bash
copy .env.example .env  # Windows
cp .env.example .env    # Linux/Mac
```

#### 2. Levantar el entorno
```bash
docker-compose up -d
```

#### 3. Ejecutar migraciones
```bash
docker-compose exec api alembic upgrade head
```

#### 4. Verificar que todo funciona
Abrir en el navegador: http://localhost:8000/docs

## Desarrollo

### Estructura del Proyecto

```
jw-meeting-backend/
├── src/
│   ├── shared/              # Código compartido
│   ├── modules/
│   │   ├── scraper/        # Módulo de extracción EPUB
│   │   ├── assignments/    # Módulo de asignaciones
│   │   └── program/        # Módulo de programa
│   └── api/                # API REST
├── migrations/             # Migraciones Alembic
├── tests/                  # Tests
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

### Comandos Útiles

```bash
# Ver logs
docker-compose logs -f api

# Ejecutar tests
docker-compose exec api pytest

# Acceder al shell de Python
docker-compose exec api python

# Crear nueva migración
docker-compose exec api alembic revision --autogenerate -m "descripcion"

# Detener servicios
docker-compose down

# Reconstruir contenedores
docker-compose up -d --build
```

## Testing

```bash
# Ejecutar todos los tests
docker-compose exec api pytest

# Con coverage
docker-compose exec api pytest --cov=src --cov-report=html

# Tests específicos
docker-compose exec api pytest tests/unit/modules/scraper/
```

## Variables de Entorno

Ver `.env.example` para configuración. Copiar a `.env` y ajustar según necesidad.

## Licencia

Uso personal - Mayor Buratovich
