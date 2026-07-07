# Quick Start Guide

## 🚀 Inicio Rápido

### 1. Copiar variables de entorno
```bash
copy .env.example .env
```

### 2. Levantar el entorno
```bash
docker-compose up -d
```

### 3. Verificar que todo funciona
Abrir en el navegador: http://localhost:8000/docs

## 📚 Próximos Pasos

1. **Implementar modelos de base de datos** - Definir entidades en SQLAlchemy
2. **Crear migraciones** - Generar esquema de BD con Alembic
3. **Refactorizar scraper** - Migrar lógica existente al módulo scraper
4. **Implementar servicios** - Crear lógica de negocio
5. **Crear endpoints** - Exponer funcionalidad vía API REST

## 🛠️ Comandos Útiles

```bash
# Ver logs
docker-compose logs -f api

# Ejecutar tests
docker-compose exec api pytest

# Crear migración
docker-compose exec api alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
docker-compose exec api alembic upgrade head

# Acceder al shell
docker-compose exec api /bin/bash
```

## 📖 Aprendizaje

Este proyecto te permitirá aprender:
- ✅ **FastAPI** - Framework web moderno con async/await
- ✅ **SQLAlchemy 2.0** - ORM con soporte async
- ✅ **Alembic** - Migraciones de base de datos
- ✅ **Docker & Docker Compose** - Contenedorización
- ✅ **Clean Architecture** - Separación de responsabilidades
- ✅ **PostgreSQL** - Base de datos relacional
- ✅ **Pytest** - Testing con fixtures async
