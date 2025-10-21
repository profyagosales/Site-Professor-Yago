Remoções na branch remove/radar-ranking

Arquivos excluídos:
- frontend/src/components/dashboard/ranking/RadarRankingCard.tsx — componente principal do card de Radar/Ranking no dashboard.
- frontend/src/components/dashboard/ranking/RankingToolbar.tsx — toolbar de filtros do ranking.
- frontend/src/components/dashboard/ranking/RankingList.tsx — listagem de itens do ranking.
- frontend/src/components/dashboard/ranking/Sparkline.tsx — micrográfico usado no ranking.
- frontend/src/components/dashboard/ranking/ConfettiBurst.tsx — efeito visual do ranking.

Referências removidas/ajustadas:
- frontend/src/pages/DashboardProfessor.jsx — removida a importação e o uso de `<RadarRankingCard />`.
- frontend/src/styles.css — removidas classes específicas `.dash-grid .radar` e regras relacionadas.
- frontend/src/api/rankings.ts — comentado acesso à rota `/api/analytics/rankings` (TODO para remoção de backend).
- frontend/src/api/radar.ts — comentada criação de URL de rankings (TODO para remoção de backend).
- frontend/src/services/analytics.ts — comentadas importações relacionadas a rankings.
- frontend/src/features/radar/services.ts — comentada constante de endpoint de rankings.

Motivo: remoção completa da funcionalidade Radar/Ranking no frontend e isolamento seguro de referências de backend para revisão futura.

