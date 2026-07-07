# Makefile para comandos comunes del proyecto

.PHONY: help build up down logs shell test migrate revision clean

help:
	@echo "Comandos disponibles:"
	@echo "  make build      - Construir contenedores Docker"
	@echo "  make up         - Levantar servicios"
	@echo "  make down       - Detener servicios"
	@echo "  make logs       - Ver logs de la API"
	@echo "  make shell      - Acceder al shell del contenedor"
	@echo "  make test       - Ejecutar tests"
	@echo "  make migrate    - Ejecutar migraciones"
	@echo "  make revision   - Crear nueva migración"
	@echo "  make clean      - Limpiar contenedores y volúmenes"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f api

shell:
	docker-compose exec api /bin/bash

test:
	docker-compose exec api pytest

migrate:
	docker-compose exec api alembic upgrade head

revision:
	@read -p "Mensaje de migración: " msg; \
	docker-compose exec api alembic revision --autogenerate -m "$$msg"

clean:
	docker-compose down -v
	docker system prune -f
