# JW Meeting System - Full Stack

Sistema completo de gestión de programas de reuniones con backend FastAPI y frontend React.

## 🚀 Inicio Rápido

### Levantar todo el sistema

```bash
docker-compose up -d
```

Esto iniciará:
- **Frontend** - http://localhost:5173
- **Backend API** - http://localhost:8000
- **API Docs** - http://localhost:8000/docs
- **PostgreSQL** - localhost:5432

### Primera vez

1. **Ejecutar migraciones**
   ```bash
   docker-compose exec api alembic upgrade head
   ```

2. **Acceder a la aplicación**
   - Abrir http://localhost:5173 en el navegador
   - Crear congregación
   - Agregar personas
   - Importar programa desde EPUB

## 📁 Estructura del Proyecto

```
jw_scrapping/
├── jw-meeting-backend/      # Backend FastAPI
│   ├── src/                 # Código fuente
│   ├── migrations/          # Migraciones Alembic
│   ├── tests/               # Tests
│   ├── data/                # Archivos EPUB
│   ├── Dockerfile
│   └── requirements.txt
├── jw-meeting-frontend/     # Frontend React
│   ├── src/                 # Código fuente
│   ├── public/              # Archivos estáticos
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml       # Orquestación completa
```

## 🛠️ Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Solo frontend
docker-compose logs -f frontend

# Solo backend
docker-compose logs -f api
```

### Ejecutar tests
```bash
# Backend
docker-compose exec api pytest

# Frontend
docker-compose exec frontend npm test
```

### Detener servicios
```bash
docker-compose down
```

### Reconstruir
```bash
docker-compose up -d --build
```

### Limpiar todo
```bash
docker-compose down -v
```

## 🔧 Desarrollo

### Backend
- Puerto: 8000
- Hot reload: ✅ Habilitado
- Código: `./jw-meeting-backend/src`

### Frontend
- Puerto: 5173
- Hot reload: ✅ Habilitado
- Código: `./jw-meeting-frontend/src`

### Base de Datos
- Puerto: 5432
- Usuario: `jwmeeting`
- Password: `jwmeeting_dev`
- Database: `jw_meeting`

## 📊 Servicios

| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5432 | localhost:5432 |
| pgAdmin* | 5050 | http://localhost:5050 |

*pgAdmin solo con `docker-compose --profile tools up`

## 🎯 Flujo de Trabajo

1. **Desarrollo Backend**
   - Editar archivos en `jw-meeting-backend/src/`
   - Los cambios se reflejan automáticamente (hot reload)

2. **Desarrollo Frontend**
   - Editar archivos en `jw-meeting-frontend/src/`
   - Los cambios se reflejan automáticamente (hot reload)

3. **Migraciones de BD**
   ```bash
   # Crear migración
   docker-compose exec api alembic revision --autogenerate -m "descripcion"
   
   # Aplicar migración
   docker-compose exec api alembic upgrade head
   ```

## 🐛 Troubleshooting

### Frontend no se conecta al backend
Verificar que `VITE_API_URL` esté configurado correctamente en docker-compose.yml

### Base de datos no está lista
Esperar a que el healthcheck de PostgreSQL pase antes de ejecutar migraciones

### Cambios no se reflejan
Verificar que los volúmenes estén montados correctamente en docker-compose.yml

## 📝 Licencia

Uso personal - Mayor Buratovich
