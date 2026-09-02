import { createFileRoute, redirect } from "@tanstack/react-router";

// El prototipo es 100% vainilla: HTML + Bootstrap por CDN + JS sin dependencias.
// Vive como archivo estático en public/app.html; "/" solo redirige ahí.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Forcaster — Proyección de costos | Molten Logistics" },
      {
        name: "description",
        content:
          "Prototipo de Sales Forcaster: fija productos, revisa precios históricos y proyecta costos a corto, mediano y largo plazo.",
      },
      { property: "og:title", content: "Sales Forcaster by Molten Logistics" },
      {
        property: "og:description",
        content:
          "Proyección de costos de productos para vendedores grandes, medianos y chicos.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ href: "/app.html" });
  },
  component: () => null,
});
