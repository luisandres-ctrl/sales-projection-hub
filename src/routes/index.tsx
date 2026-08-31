import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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
  component: SalesForcasterMockup,
});

/* ------------------------------------------------------------------ */
/* Datos tontos (mock)                                                 */
/* ------------------------------------------------------------------ */

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  change: number;
  history: number[];
  supplier: string;
};

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Aguacate Hass",
    sku: "AGH-4KG",
    category: "Agrícola",
    unit: "caja 4 kg",
    price: 412.5,
    change: 6.4,
    supplier: "Uruapan, MICH",
    history: [318, 330, 352, 341, 366, 380, 372, 391, 398, 404, 407, 412],
  },
  {
    id: "p2",
    name: "Resina PET grado botella",
    sku: "PET-25KG",
    category: "Insumos",
    unit: "saco 25 kg",
    price: 1180,
    change: -2.1,
    supplier: "Altamira, TAMS",
    history: [1290, 1275, 1262, 1240, 1233, 1210, 1224, 1198, 1205, 1192, 1186, 1180],
  },
  {
    id: "p3",
    name: "Café verde arábica",
    sku: "CAF-60KG",
    category: "Agrícola",
    unit: "saco 60 kg",
    price: 7450,
    change: 11.2,
    supplier: "Coatepec, VER",
    history: [5100, 5320, 5480, 5610, 5890, 6150, 6420, 6680, 6910, 7080, 7290, 7450],
  },
  {
    id: "p4",
    name: "Cartón corrugado doble",
    sku: "CRR-1000",
    category: "Empaque",
    unit: "millar",
    price: 8620,
    change: 1.8,
    supplier: "Monterrey, NL",
    history: [8180, 8210, 8250, 8290, 8330, 8360, 8400, 8455, 8490, 8530, 8580, 8620],
  },
  {
    id: "p5",
    name: "Flete seco 53' nacional",
    sku: "FLT-53N",
    category: "Logística",
    unit: "viaje",
    price: 32400,
    change: 4.9,
    supplier: "Molten Logistics",
    history: [
      28900, 29200, 29800, 30100, 30400, 30050, 30900, 31200, 31600, 31900, 32100, 32400,
    ],
  },
  {
    id: "p6",
    name: "Aceite de canola",
    sku: "ACN-20L",
    category: "Insumos",
    unit: "cubeta 20 L",
    price: 968,
    change: -1.2,
    supplier: "Guadalajara, JAL",
    history: [1010, 1005, 998, 1002, 990, 985, 979, 982, 974, 971, 970, 968],
  },
];

const MONTHS = [
  "Sep",
  "Oct",
  "Nov",
  "Dic",
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
];

type Saved = {
  id: string;
  productId: string;
  horizon: "corto" | "mediano" | "largo";
  units: number;
  margin: number;
  updated: string;
};

const SAVED: Saved[] = [
  { id: "s1", productId: "p1", horizon: "corto", units: 320, margin: 22, updated: "Hoy, 11:40" },
  { id: "s2", productId: "p3", horizon: "largo", units: 45, margin: 31, updated: "Ayer, 18:02" },
  { id: "s3", productId: "p5", horizon: "mediano", units: 12, margin: 15, updated: "27 Ago" },
  { id: "s4", productId: "p4", horizon: "corto", units: 8, margin: 18, updated: "24 Ago" },
];

const HORIZONS = {
  corto: { label: "Corto plazo", months: 3, drift: 1.0 },
  mediano: { label: "Mediano plazo", months: 6, drift: 1.15 },
  largo: { label: "Largo plazo", months: 12, drift: 1.35 },
} as const;

type Horizon = keyof typeof HORIZONS;

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/* Proyección tonta: tendencia lineal simple + deriva por horizonte */
function project(p: Product, horizon: Horizon) {
  const h = HORIZONS[horizon];
  const last = p.history[p.history.length - 1]!;
  const first = p.history[0]!;
  const monthly = (last - first) / (p.history.length - 1);
  const out: { label: string; base: number; low: number; high: number }[] = [];
  for (let i = 1; i <= h.months; i++) {
    const base = last + monthly * i * h.drift;
    const spread = base * (0.025 + 0.011 * i);
    out.push({
      label: MONTHS[(11 + i) % 12]!,
      base: Math.round(base),
      low: Math.round(base - spread),
      high: Math.round(base + spread),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Gráficas SVG                                                        */
/* ------------------------------------------------------------------ */

function LineChart({
  history,
  forecast,
}: {
  history: number[];
  forecast: { base: number; low: number; high: number }[];
}) {
  const W = 640;
  const H = 220;
  const pad = 10;
  const all = [
    ...history,
    ...forecast.map((f) => f.high),
    ...forecast.map((f) => f.low),
  ];
  const min = Math.min(...all) * 0.97;
  const max = Math.max(...all) * 1.03;
  const total = history.length + forecast.length;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (total - 1);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);

  const histPts = history.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const fcIdx = (i: number) => history.length - 1 + i;
  const fcPts = [
    `${x(history.length - 1)},${y(history[history.length - 1]!)}`,
    ...forecast.map((f, i) => `${x(fcIdx(i + 1))},${y(f.base)}`),
  ].join(" ");
  const band = [
    ...forecast.map((f, i) => `${x(fcIdx(i + 1))},${y(f.high)}`),
    ...forecast
      .map((f, i) => `${x(fcIdx(i + 1))},${y(f.low)}`)
      .reverse(),
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-100" role="img" aria-label="Precio histórico y proyección">
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={W - pad}
          y1={pad + g * (H - pad * 2)}
          y2={pad + g * (H - pad * 2)}
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      <polygon points={band} fill="rgba(242,147,13,0.16)" />
      <polyline points={histPts} fill="none" stroke="#eef2ef" strokeWidth="2.5" />
      <polyline
        points={fcPts}
        fill="none"
        stroke="#f2930d"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      {history.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="#eef2ef" />
      ))}
      {forecast.map((f, i) => (
        <circle key={i} cx={x(fcIdx(i + 1))} cy={y(f.base)} r="3" fill="#f2930d" />
      ))}
    </svg>
  );
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const W = 90;
  const H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = (i * W) / (data.length - 1);
      const y = H - ((v - min) / (max - min || 1)) * H;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "#6ee7a8" : "#ff8f7a"}
        strokeWidth="2"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Pantallas de acceso                                                 */
/* ------------------------------------------------------------------ */

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <span className="ml-logo-mark">SF</span>
      <span className="lh-1">
        <span className="d-block ml-display" style={{ fontSize: compact ? "0.98rem" : "1.15rem" }}>
          Sales Forcaster
        </span>
        <span className="d-block ml-dim" style={{ fontSize: "0.7rem" }}>
          by Molten Logistics
        </span>
      </span>
    </div>
  );
}

function AuthScreen({
  mode,
  setMode,
  onEnter,
}: {
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  onEnter: () => void;
}) {
  const isLogin = mode === "login";
  return (
    <main className="container py-4 py-lg-5">
      <div className="row justify-content-center align-items-center g-4 g-lg-5">
        <div className="col-12 col-lg-6">
          <Brand />
          <p className="ml-eyebrow mt-4 mb-2">Proyección de costos</p>
          <h1 className="ml-display display-5 mb-3">
            Sabe cuánto te va a costar
            <span style={{ color: "var(--ml-orange)" }}> antes de comprar</span>.
          </h1>
          <p className="ml-dim mb-4" style={{ maxWidth: "46ch" }}>
            Fija tus productos clave, revisa su precio histórico y proyecta escenarios a
            corto, mediano y largo plazo. Para vendedores chicos, medianos y grandes.
          </p>
          <div className="row g-3">
            {[
              ["bi-pin-angle", "Productos fijados"],
              ["bi-graph-up-arrow", "Histórico 12 meses"],
              ["bi-sliders", "Escenarios de margen"],
            ].map(([icon, text]) => (
              <div className="col-12 col-sm-4" key={text}>
                <div className="ml-card-plain p-3 h-100">
                  <i className={`bi ${icon} fs-5`} style={{ color: "var(--ml-orange)" }} />
                  <div className="small mt-2 fw-semibold">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-12 col-md-9 col-lg-5">
          <div className="ml-card p-4 p-lg-4">
            <div className="d-flex gap-2 mb-4">
              <button
                className={`ml-chip flex-fill ${isLogin ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Iniciar sesión
              </button>
              <button
                className={`ml-chip flex-fill ${!isLogin ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                Crear cuenta
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEnter();
              }}
            >
              {!isLogin && (
                <>
                  <label className="form-label small fw-semibold">Nombre del negocio</label>
                  <input className="form-control ml-input mb-3" placeholder="Distribuidora del Norte" />
                </>
              )}
              <label className="form-label small fw-semibold">Correo</label>
              <input
                type="email"
                className="form-control ml-input mb-3"
                placeholder="tu@negocio.com"
                defaultValue="demo@moltenlogistics.com"
              />
              <label className="form-label small fw-semibold">Contraseña</label>
              <input
                type="password"
                className="form-control ml-input mb-3"
                defaultValue="demo1234"
              />
              {!isLogin && (
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" defaultChecked id="tos" />
                  <label className="form-check-label small ml-dim" htmlFor="tos">
                    Acepto los términos y el aviso de privacidad
                  </label>
                </div>
              )}
              <button type="submit" className="btn ml-btn-primary w-100 py-2">
                {isLogin ? "Entrar al panel" : "Crear mi cuenta"}
              </button>
            </form>

            <div className="d-flex align-items-center gap-2 my-3 ml-dim small">
              <span className="flex-fill border-top" style={{ opacity: 0.2 }} />o continúa con
              <span className="flex-fill border-top" style={{ opacity: 0.2 }} />
            </div>

            <button className="btn ml-btn-ghost w-100 py-2 mb-2" onClick={onEnter}>
              <i className="bi bi-google me-2" /> Google
            </button>
            <button className="btn ml-btn-ghost w-100 py-2" onClick={onEnter}>
              <i className="bi bi-envelope me-2" /> Enlace por correo
            </button>

            <p className="ml-dim small text-center mb-0 mt-3">
              Prototipo demostrativo · datos de ejemplo
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

type Tab = "buscar" | "proyeccion" | "guardadas" | "cuenta";

function SalesForcasterMockup() {
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [tab, setTab] = useState<Tab>("buscar");
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState<string[]>(["p1", "p3"]);
  const [selected, setSelected] = useState<Product>(PRODUCTS[0]!);
  const [horizon, setHorizon] = useState<Horizon>("corto");
  const [units, setUnits] = useState(320);
  const [margin, setMargin] = useState(22);
  const [saved, setSaved] = useState<Saved[]>(SAVED);

  useEffect(() => {
    document.body.classList.add("ml-app");
    return () => document.body.classList.remove("ml-app");
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter((p) =>
      [p.name, p.sku, p.category, p.supplier].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

  const forecast = useMemo(() => project(selected, horizon), [selected, horizon]);
  const last = selected.history[selected.history.length - 1]!;
  const end = forecast[forecast.length - 1]!;
  const deltaPct = ((end.base - last) / last) * 100;
  const unitCost = end.base;
  const totalCost = unitCost * units;
  const salePrice = unitCost * (1 + margin / 100);

  const togglePin = (id: string) =>
    setPinned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openProduct = (p: Product) => {
    setSelected(p);
    setTab("proyeccion");
  };

  if (!authed) {
    return <AuthScreen mode={mode} setMode={setMode} onEnter={() => setAuthed(true)} />;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="ml-nav sticky-top">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <Brand compact />
          <div className="d-none d-md-flex align-items-center gap-1">
            {(
              [
                ["buscar", "Buscar", "bi-search"],
                ["proyeccion", "Proyección", "bi-graph-up-arrow"],
                ["guardadas", "Guardadas", "bi-bookmark"],
                ["cuenta", "Cuenta", "bi-person"],
              ] as [Tab, string, string][]
            ).map(([key, label, icon]) => (
              <button
                key={key}
                className={`ml-chip ${tab === key ? "active" : ""}`}
                onClick={() => setTab(key)}
              >
                <i className={`bi ${icon} me-1`} />
                {label}
              </button>
            ))}
          </div>
          <button className="btn ml-btn-ghost btn-sm d-none d-md-inline-flex" onClick={() => setAuthed(false)}>
            Salir
          </button>
          <span className="ml-chip d-md-none">
            <i className="bi bi-person-circle me-1" /> Demo
          </span>
        </div>
      </header>

      <main className="container py-4 flex-grow-1">
        {/* ---------------- BUSCAR ---------------- */}
        {tab === "buscar" && (
          <>
            <p className="ml-eyebrow mb-1">Búsqueda libre</p>
            <h1 className="ml-display h3 mb-3">¿Qué producto quieres proyectar?</h1>
            <div className="ml-card p-3 mb-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-0 ml-dim">
                  <i className="bi bi-search" />
                </span>
                <input
                  className="form-control ml-input border-0"
                  placeholder="Aguacate, resina PET, flete 53', SKU…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                {["Agrícola", "Insumos", "Empaque", "Logística"].map((c) => (
                  <button key={c} className="ml-chip" onClick={() => setQuery(c)}>
                    {c}
                  </button>
                ))}
                {query && (
                  <button className="ml-chip" onClick={() => setQuery("")}>
                    <i className="bi bi-x-lg me-1" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {pinned.length > 0 && (
              <>
                <h2 className="h6 ml-dim text-uppercase mb-2" style={{ letterSpacing: "0.12em" }}>
                  Productos fijados
                </h2>
                <div className="row g-3 mb-4">
                  {PRODUCTS.filter((p) => pinned.includes(p.id)).map((p) => (
                    <div className="col-12 col-md-6 col-xl-4" key={p.id}>
                      <div className="ml-card p-3 h-100">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold">{p.name}</div>
                            <div className="small ml-dim">
                              {p.sku} · {p.unit}
                            </div>
                          </div>
                          <button
                            className="btn btn-sm ml-btn-ghost"
                            onClick={() => togglePin(p.id)}
                            aria-label="Quitar de fijados"
                          >
                            <i className="bi bi-pin-fill" style={{ color: "var(--ml-orange)" }} />
                          </button>
                        </div>
                        <div className="d-flex justify-content-between align-items-end mt-3">
                          <div>
                            <div className="ml-display fs-4">{money(p.price)}</div>
                            <div className={`small ${p.change >= 0 ? "ml-pill-up" : "ml-pill-down"}`}>
                              <i className={`bi ${p.change >= 0 ? "bi-arrow-up-right" : "bi-arrow-down-right"}`} />{" "}
                              {Math.abs(p.change).toFixed(1)}% 12m
                            </div>
                          </div>
                          <Sparkline data={p.history} up={p.change >= 0} />
                        </div>
                        <button
                          className="btn ml-btn-primary w-100 mt-3"
                          onClick={() => openProduct(p)}
                        >
                          Proyectar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="h6 ml-dim text-uppercase mb-2" style={{ letterSpacing: "0.12em" }}>
              {query ? `Resultados (${results.length})` : "Catálogo de ejemplo"}
            </h2>
            <div className="ml-card px-3">
              {results.map((p) => (
                <div
                  key={p.id}
                  className="ml-row d-flex align-items-center gap-3 py-3 flex-wrap"
                >
                  <button
                    className="btn btn-sm ml-btn-ghost"
                    onClick={() => togglePin(p.id)}
                    aria-label="Fijar producto"
                  >
                    <i
                      className={`bi ${pinned.includes(p.id) ? "bi-pin-fill" : "bi-pin-angle"}`}
                      style={pinned.includes(p.id) ? { color: "var(--ml-orange)" } : undefined}
                    />
                  </button>
                  <div className="flex-grow-1" style={{ minWidth: "10rem" }}>
                    <div className="fw-semibold">{p.name}</div>
                    <div className="small ml-dim">
                      {p.category} · {p.supplier}
                    </div>
                  </div>
                  <Sparkline data={p.history} up={p.change >= 0} />
                  <div className="text-end" style={{ minWidth: "6.5rem" }}>
                    <div className="fw-bold">{money(p.price)}</div>
                    <div className={`small ${p.change >= 0 ? "ml-pill-up" : "ml-pill-down"}`}>
                      {p.change >= 0 ? "+" : ""}
                      {p.change.toFixed(1)}%
                    </div>
                  </div>
                  <button className="btn btn-sm ml-btn-primary" onClick={() => openProduct(p)}>
                    Proyectar
                  </button>
                </div>
              ))}
              {results.length === 0 && (
                <p className="ml-dim py-4 mb-0 text-center">Sin resultados para “{query}”.</p>
              )}
            </div>
          </>
        )}

        {/* ---------------- PROYECCIÓN ---------------- */}
        {tab === "proyeccion" && (
          <>
            <button className="btn btn-sm ml-btn-ghost mb-3" onClick={() => setTab("buscar")}>
              <i className="bi bi-arrow-left me-1" /> Buscar otro producto
            </button>
            <div className="row g-4">
              <div className="col-12 col-lg-8">
                <div className="ml-card p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <p className="ml-eyebrow mb-1">{selected.category}</p>
                      <h1 className="ml-display h4 mb-1">{selected.name}</h1>
                      <div className="small ml-dim">
                        {selected.sku} · {selected.unit} · {selected.supplier}
                      </div>
                    </div>
                    <button className="btn ml-btn-ghost btn-sm" onClick={() => togglePin(selected.id)}>
                      <i
                        className={`bi ${pinned.includes(selected.id) ? "bi-pin-fill" : "bi-pin-angle"} me-1`}
                      />
                      {pinned.includes(selected.id) ? "Fijado" : "Fijar"}
                    </button>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    {(Object.keys(HORIZONS) as Horizon[]).map((h) => (
                      <button
                        key={h}
                        className={`ml-chip ${horizon === h ? "active" : ""}`}
                        onClick={() => setHorizon(h)}
                      >
                        {HORIZONS[h].label} · {HORIZONS[h].months}m
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <LineChart history={selected.history} forecast={forecast} />
                    <div className="d-flex gap-3 small ml-dim mt-2 flex-wrap">
                      <span>
                        <span
                          className="d-inline-block me-1"
                          style={{ width: 14, height: 2, background: "#eef2ef", verticalAlign: "middle" }}
                        />
                        Histórico 12 m
                      </span>
                      <span>
                        <span
                          className="d-inline-block me-1"
                          style={{ width: 14, height: 2, background: "var(--ml-orange)", verticalAlign: "middle" }}
                        />
                        Proyección
                      </span>
                      <span>
                        <span
                          className="d-inline-block me-1"
                          style={{
                            width: 14,
                            height: 8,
                            background: "rgba(242,147,13,0.25)",
                            verticalAlign: "middle",
                          }}
                        />
                        Rango optimista / pesimista
                      </span>
                    </div>
                  </div>

                  <div className="table-responsive mt-4">
                    <table className="table table-borderless align-middle mb-0 ml-table">
                      <thead className="small ml-dim">
                        <tr>
                          <th>Mes</th>
                          <th className="text-end">Pesimista</th>
                          <th className="text-end">Esperado</th>
                          <th className="text-end">Optimista</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.map((f) => (
                          <tr key={f.label} className="ml-row">
                            <td className="fw-semibold">{f.label}</td>
                            <td className="text-end ml-pill-down">{money(f.high)}</td>
                            <td className="text-end fw-bold">{money(f.base)}</td>
                            <td className="text-end ml-pill-up">{money(f.low)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-4">
                <div className="ml-card p-3 p-md-4 mb-4">
                  <p className="ml-eyebrow mb-2">Escenario</p>
                  <label className="form-label small fw-semibold d-flex justify-content-between">
                    <span>Volumen ({selected.unit})</span>
                    <span style={{ color: "var(--ml-orange)" }}>{units}</span>
                  </label>
                  <input
                    type="range"
                    className="form-range mb-3"
                    min={1}
                    max={1000}
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                  />
                  <label className="form-label small fw-semibold d-flex justify-content-between">
                    <span>Margen objetivo</span>
                    <span style={{ color: "var(--ml-orange)" }}>{margin}%</span>
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    min={0}
                    max={60}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                  />
                </div>

                <div className="ml-card p-3 p-md-4 mb-4">
                  <p className="ml-eyebrow mb-3">Resultado a {HORIZONS[horizon].months} meses</p>
                  {[
                    ["Costo unitario proyectado", money(unitCost)],
                    ["Costo total del lote", money(totalCost)],
                    ["Precio de venta sugerido", money(salePrice)],
                    ["Utilidad estimada", money(salePrice * units - totalCost)],
                  ].map(([k, v]) => (
                    <div key={k} className="ml-row d-flex justify-content-between py-2">
                      <span className="small ml-dim">{k}</span>
                      <span className="fw-bold">{v}</span>
                    </div>
                  ))}
                  <div className="d-flex justify-content-between py-2">
                    <span className="small ml-dim">Variación vs. hoy</span>
                    <span className={`fw-bold ${deltaPct >= 0 ? "ml-pill-down" : "ml-pill-up"}`}>
                      {deltaPct >= 0 ? "+" : ""}
                      {deltaPct.toFixed(1)}%
                    </span>
                  </div>
                  <button
                    className="btn ml-btn-primary w-100 mt-3"
                    onClick={() => {
                      setSaved((prev) => [
                        {
                          id: `s${Date.now()}`,
                          productId: selected.id,
                          horizon,
                          units,
                          margin,
                          updated: "Ahora",
                        },
                        ...prev,
                      ]);
                      setTab("guardadas");
                    }}
                  >
                    <i className="bi bi-bookmark-plus me-1" /> Guardar proyección
                  </button>
                </div>

                <div className="ml-card-plain p-3 small ml-dim">
                  <i className="bi bi-info-circle me-1" style={{ color: "var(--ml-orange)" }} />
                  Modelo demostrativo: tendencia lineal de los últimos 12 meses con deriva por
                  horizonte. Los datos son de ejemplo.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------- GUARDADAS ---------------- */}
        {tab === "guardadas" && (
          <>
            <p className="ml-eyebrow mb-1">Mi biblioteca</p>
            <h1 className="ml-display h3 mb-3">Proyecciones guardadas</h1>
            <div className="row g-3">
              {saved.map((s) => {
                const p = PRODUCTS.find((x) => x.id === s.productId)!;
                const f = project(p, s.horizon);
                const e = f[f.length - 1]!;
                return (
                  <div className="col-12 col-md-6 col-xl-4" key={s.id}>
                    <div className="ml-card p-3 h-100 d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-bold">{p.name}</div>
                          <div className="small ml-dim">
                            {HORIZONS[s.horizon].label} · {s.units} {p.unit}
                          </div>
                        </div>
                        <span className="ml-chip">{s.margin}% margen</span>
                      </div>
                      <div className="my-3">
                        <Sparkline data={[...p.history, ...f.map((x) => x.base)]} up={e.base >= p.price} />
                      </div>
                      <div className="ml-row d-flex justify-content-between py-2">
                        <span className="small ml-dim">Costo unitario proyectado</span>
                        <span className="fw-bold">{money(e.base)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-2">
                        <span className="small ml-dim">Actualizado</span>
                        <span className="small">{s.updated}</span>
                      </div>
                      <div className="d-flex gap-2 mt-auto pt-2">
                        <button
                          className="btn ml-btn-primary flex-fill btn-sm"
                          onClick={() => {
                            setSelected(p);
                            setHorizon(s.horizon);
                            setUnits(s.units);
                            setMargin(s.margin);
                            setTab("proyeccion");
                          }}
                        >
                          Abrir
                        </button>
                        <button
                          className="btn ml-btn-ghost btn-sm"
                          onClick={() => setSaved((prev) => prev.filter((x) => x.id !== s.id))}
                          aria-label="Eliminar proyección"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {saved.length === 0 && (
                <div className="col-12">
                  <div className="ml-card p-5 text-center ml-dim">
                    Aún no guardas proyecciones.
                    <div className="mt-3">
                      <button className="btn ml-btn-primary" onClick={() => setTab("buscar")}>
                        Buscar un producto
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------------- CUENTA ---------------- */}
        {tab === "cuenta" && (
          <>
            <p className="ml-eyebrow mb-1">Cuenta</p>
            <h1 className="ml-display h3 mb-3">Distribuidora Demo</h1>
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <div className="ml-card p-4">
                  <div className="d-flex align-items-center gap-3">
                    <span className="ml-logo-mark" style={{ width: 52, height: 52 }}>
                      DD
                    </span>
                    <div>
                      <div className="fw-bold">demo@moltenlogistics.com</div>
                      <div className="small ml-dim">Conectado con Google · plan Vendedor Pro</div>
                    </div>
                  </div>
                  {[
                    ["Productos fijados", String(pinned.length)],
                    ["Proyecciones guardadas", String(saved.length)],
                    ["Moneda", "MXN"],
                    ["Zona", "México · Centro"],
                  ].map(([k, v]) => (
                    <div key={k} className="ml-row d-flex justify-content-between py-2 mt-1">
                      <span className="small ml-dim">{k}</span>
                      <span className="fw-semibold">{v}</span>
                    </div>
                  ))}
                  <button className="btn ml-btn-ghost w-100 mt-3" onClick={() => setAuthed(false)}>
                    Cerrar sesión
                  </button>
                </div>
              </div>
              <div className="col-12 col-lg-6">
                <div className="ml-card-plain p-4 h-100">
                  <p className="ml-eyebrow mb-2">Prototipo</p>
                  <p className="ml-dim mb-0">
                    Esta versión no se conecta a internet ni a una base de datos: usa datos de
                    ejemplo para validar flujo y diseño en iPhone, iPad y laptop.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <nav className="ml-tabbar d-md-none">
        <div className="d-flex justify-content-around py-2">
          {(
            [
              ["buscar", "Buscar", "bi-search"],
              ["proyeccion", "Proyección", "bi-graph-up-arrow"],
              ["guardadas", "Guardadas", "bi-bookmark"],
              ["cuenta", "Cuenta", "bi-person"],
            ] as [Tab, string, string][]
          ).map(([key, label, icon]) => (
            <button
              key={key}
              className={`ml-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              <i className={`bi ${icon}`} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
