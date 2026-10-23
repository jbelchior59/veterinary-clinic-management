# Sistema Clínico Veterinário

[![CI](https://github.com/Projeto-Les-PL3-7/Projeto_LES_PL3-7/actions/workflows/ci.yml/badge.svg)](https://github.com/Projeto-Les-PL3-7/Projeto_LES_PL3-7/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/Backend-NestJS-e0234e?logo=nestjs)
![React](https://img.shields.io/badge/Frontend-React-61dafb?logo=react)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2d3748?logo=prisma)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ed?logo=docker)

Aplicação web full-stack para gestão clínica veterinária, com foco no módulo de análises laboratoriais. Desenvolvida no âmbito de Laboratório de Engenharia de Software 2025/2026 — Universidade do Algarve (Grupo PL3-7).

---

## Arranque Rápido

> Requer apenas o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

```bash
git clone https://github.com/jbelchior59/veterinary-clinic-management.git
cd veterinary-clinic-management
docker compose up --build
```

Na primeira execução o Docker compila o projeto, aplica as migrações e popula a base de dados automaticamente (~2 min).

| Serviço | URL |
|---------|-----|
| Aplicação Web | http://localhost |
| Swagger / API Docs | http://localhost:3000/api |

```bash
docker compose down        # parar
docker compose down -v     # parar e apagar a base de dados
```

---

## Credenciais de Teste

| Perfil | Email | Password |
|--------|-------|----------|
| Administrador | admin@les.local | admin123 |
| Veterinário | vet@les.local | vet123 |
| Veterinária | ana.vet@les.local | ana123 |
| Rececionista | rececao@les.local | rececao123 |
| Rececionista | miguel.rececao@les.local | miguel123 |
| Técnico de Laboratório | tecnico@les.local | tecnico123 |
| Técnica de Laboratório | sofia.lab@les.local | sofia123 |

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Autenticação | JWT + RBAC (ADMIN, VETERINARIO, TECNICO, RECECIONISTA, TUTOR) |
| Dashboard | Estatísticas e atalhos por perfil |
| Donos & Animais | Registo com alertas clínicos e histórico completo |
| Marcações | Criação, cancelamento e controlo de estado |
| Consultas & Tratamentos | Registo clínico com diagnóstico e medicação |
| Vacinação | Registo de vacinas com calendário de reforço |
| Laboratório | Pedidos de exame → amostras → resultados → validação → relatório |
| Internamentos | Admissão, observações periódicas e alta |
| Faturação | Faturas, linhas de serviço e registo de pagamentos |
| Stock | Controlo de materiais clínicos com movimentos de entrada/saída |
| Receção | Dashboard do dia, check-in e comunicações |
| Utilizadores | Gestão de contas e papéis (ADMIN) |

---

## Stack Tecnológico

**Backend** — NestJS · TypeScript · Prisma ORM · SQLite · JWT · bcrypt · Swagger/OpenAPI  
**Frontend** — React 18 · TypeScript · Vite · Tailwind CSS · React Router  
**Infraestrutura** — Docker · Docker Compose · GitHub Actions (CI) · Jest · Supertest

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- npm

### Backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API: `http://localhost:3000` · Swagger: `http://localhost:3000/api`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação: `http://localhost:5173`

### Variáveis de Ambiente (backend)

Criar `backend/.env`:

```env
PORT=3000
DATABASE_URL=file:./dev.db
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=8h
```

### Testes

```bash
cd backend && npm test
```

---

## Estrutura do Projeto

```
├── backend/                  NestJS API + Prisma ORM
│   ├── src/
│   │   ├── auth/             Autenticação JWT e guards RBAC
│   │   ├── users/            Gestão de utilizadores e papéis
│   │   ├── dono/             CRUD de donos
│   │   ├── animal/           CRUD de animais e histórico clínico
│   │   ├── marcacao/         Gestão de marcações
│   │   ├── consulta/         Registo de consultas
│   │   ├── tratamento/       Registo de tratamentos
│   │   ├── exame/            Fluxo laboratorial completo
│   │   ├── internamento/     Gestão de internamentos
│   │   ├── vacina/           Registo de vacinações
│   │   ├── financial/        Faturação e pagamentos
│   │   ├── stock/            Gestão de stock
│   │   ├── rececao/          Dashboard de receção
│   │   ├── nota-rapida/      Notas clínicas rápidas
│   │   ├── audit-log/        Registo de auditoria global
│   │   └── prisma/           PrismaService (singleton global)
│   └── prisma/
│       ├── schema.prisma     Modelo de dados
│       ├── seed.ts           Dados de demonstração
│       └── migrations/       Migrações versionadas
│
└── frontend/                 React + Vite
    └── src/
        ├── views/            Dashboard, Laboratório, Internamentos,
        │                     Faturação, Stock, Receção, ...
        ├── pages/            Histórico clínico, Marcações, ...
        ├── hooks/            useAuth, useData
        └── lib/              Clientes HTTP por módulo
```

---

## Integração Contínua

O pipeline de CI corre automaticamente em cada push/PR para `main`, `develop`, `feature/*` e `fix/*`:

1. Build e testes do backend (`npm test`)
2. Build do frontend (inclui verificação de tipos TypeScript)

---

*Laboratório de Engenharia de Software 2025/2026 · Universidade do Algarve · Grupo PL3-7*
