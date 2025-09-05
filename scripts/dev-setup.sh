#!/bin/bash

# Script para configurar ambiente de desenvolvimento
# Uso: ./scripts/dev-setup.sh

set -e

echo "🚀 Configurando ambiente de desenvolvimento..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 20+ primeiro."
    exit 1
fi

# Verificar se MongoDB está rodando
if ! nc -z localhost 27017 2>/dev/null; then
    echo "⚠️  MongoDB não está rodando. Inicie o MongoDB primeiro."
    echo "   macOS: brew services start mongodb-community"
    echo "   Linux: sudo systemctl start mongod"
    echo "   Docker: docker run -d -p 27017:27017 mongo:7.0"
    exit 1
fi

echo "✅ MongoDB está rodando"

# Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
cd backend
npm ci
cd ..

# Instalar dependências do frontend
echo "📦 Instalando dependências do frontend..."
cd frontend
npm ci
cd ..

# Executar seed de desenvolvimento
echo "🌱 Executando seed de desenvolvimento..."
cd backend
npm run seed:dev
cd ..

echo "✅ Ambiente configurado com sucesso!"
echo ""
echo "🔑 Credenciais de teste:"
echo "   Professor: professor@yagosales.com / 123456"
echo "   Alunos: [nome]@email.com / 123456"
echo ""
echo "🚀 Para iniciar o desenvolvimento:"
echo "   Backend: cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🧪 Para executar testes E2E:"
echo "   cd frontend && npm run e2e:smoke"
echo "   cd frontend && npm run e2e:ui"
