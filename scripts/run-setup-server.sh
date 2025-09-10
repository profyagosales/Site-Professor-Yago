#!/bin/bash

# Este script executa o servidor API simplificado para configuração inicial

# Definir variáveis de ambiente
export NODE_ENV=development
export PORT=5050
export USE_COOKIE_AUTH=true
export MONGODB_URI=mongodb+srv://profyagored:pqtt1QixnwEVWiPH@profyago.yuhmlow.mongodb.net/ProfessorYago
export JWT_SECRET=dev_secret_key
export JWT_EXPIRATION=24h
export FRONTEND_URL=http://localhost:5173
export APP_DOMAIN=localhost

# Navegar para a pasta da API
cd "$(dirname "$0")/../api"

# Executar o servidor simplificado
echo "Iniciando servidor API simplificado na porta $PORT..."
node server-simple.js
