@echo off
:: Garante que o script roda a partir do diretório onde está salvo
cd /d "%~dp0"

title Restaurant Queue - Inicializador Windows

echo =======================================================
echo        Restaurant Queue - Sistema de Fila
echo =======================================================
echo.

:: 1. Valida se a estrutura de pastas está correta
if not exist "backend\main.go" (
    echo [ERRO] Pasta do backend nao encontrada!
    echo Certifique-se de estar rodando este script dentro da pasta raiz do projeto.
    echo.
    pause
    exit /b 1
)

:: 2. Inicia o Backend em uma nova janela
echo [1/2] Iniciando o Servidor Go (Backend)...
cd backend
start "Restaurant Queue - Servidor Go" cmd /k "go run main.go"
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao iniciar o backend.
    pause
    exit /b 1
)
cd ..

:: 3. Verifica dependências e inicia o Frontend em uma nova janela
echo [2/2] Iniciando o Servidor Vite (Frontend)...
cd frontend
if not exist "node_modules" (
    echo Pasta 'node_modules' nao encontrada. Instalando dependencias do frontend...
    call npm install
)
start "Restaurant Queue - Interface Web" cmd /k "npm run dev"
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao iniciar o frontend.
    pause
    exit /b 1
)
cd ..

echo.
echo =======================================================
echo  Servidores iniciados em novas janelas!
echo.
echo  - Backend API: http://localhost:8080
echo  - Frontend Web: http://localhost:3000
echo.
echo  Para parar a aplicacao, feche as duas janelas adicionais.
echo =======================================================
echo.
pause
