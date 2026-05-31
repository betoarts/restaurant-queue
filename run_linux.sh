#!/bin/bash

# Garante que o script roda a partir do diretório onde está salvo
cd "$(dirname "$0")"

echo "======================================================="
echo "       Restaurant Queue - Sistema de Fila (Linux)      "
echo "======================================================="
echo

# 1. Valida se a estrutura de pastas está correta
if [ ! -f "backend/main.go" ]; then
    echo -e "\e[31m[ERRO] Pasta do backend não encontrada!\e[0m"
    echo "Certifique-se de estar rodando este script na pasta raiz do projeto."
    echo
    exit 1
fi

# PIDs dos processos em background
BACKEND_PID=""
FRONTEND_PID=""

# Função executada ao fechar o script (Ctrl+C)
cleanup() {
    echo
    echo "Encerrando os servidores..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    # Garante a limpeza caso a porta 8080 fique ocupada
    kill -9 $(lsof -t -i:8080) 2>/dev/null
    echo "Servidores encerrados com sucesso."
    exit 0
}

# Captura sinais de saída para fazer a limpeza
trap cleanup SIGINT SIGTERM EXIT

# 2. Inicia o Backend
echo "[1/2] Iniciando o Servidor Go (Backend)..."
cd backend
go run main.go &
BACKEND_PID=$!
cd ..

# 3. Inicia o Frontend
echo "[2/2] Iniciando o Servidor Vite (Frontend)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Pasta 'node_modules' não encontrada. Instalando dependências..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo
echo "======================================================="
echo " Servidores iniciados com sucesso!"
echo
echo " - Backend API:  http://localhost:8080"
echo " - Frontend Web:  http://localhost:3000"
echo
echo " Pressione [Ctrl + C] nesta janela para parar ambos."
echo "======================================================="
echo

# Mantém o terminal aberto aguardando os processos em background
wait
