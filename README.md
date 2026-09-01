# Jump

App web pra registrar treinos de impulsão e acompanhar a evolução do salto vertical.

Os treinos ficam separados por categoria — **pliometria**, **força**, **alongamento** e
**mobilidade** — e as medições de salto viram um gráfico de progresso ao longo do tempo.

## O que dá pra fazer

- **Visão geral** — recorde, ganho desde a primeira medição, sequência de dias treinando
  e volume por categoria nos últimos 30 dias.
- **Treinos** — registrar sessões com exercícios, séries, repetições, carga, duração e
  esforço percebido (RPE); filtrar por categoria; editar e apagar.
- **Impulsão** — registrar saltos por tipo (CMJ, squat jump, com corrida, unilateral),
  ver a curva de evolução de cada tipo e calcular a que altura você toca a partir do
  seu alcance parado.
- **Biblioteca** — catálogo de exercícios por categoria, disponível na hora de montar
  um treino.

## Onde os dados ficam

Tudo é salvo no `localStorage` do navegador — não há servidor nem conta. O rodapé tem
**Exportar backup** (gera um `.json`) e **Importar**, pra levar o histórico pra outro
navegador ou celular.

## Rodando localmente

```bash
npm install
npm run dev
```

O Vite sobe em `http://localhost:5173`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build pra conferir antes de publicar |
| `npm run lint` | Roda o oxlint |

## Publicando

O projeto é 100% estático — o `dist/` roda em qualquer hospedagem. Na Vercel, importe o
repositório e ela detecta o Vite sozinha (build `npm run build`, saída `dist`).

## Stack

Vite · React 19 · Tailwind CSS 4. Sem backend e sem dependência de gráfico — o gráfico de
evolução é SVG escrito à mão, com paleta validada pra contraste e daltonismo em fundo escuro.
