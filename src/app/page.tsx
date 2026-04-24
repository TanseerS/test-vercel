"use client";

import { useState, useCallback } from "react";
import {
  checkHealth,
  checkUsername,
  getVendors,
  getVendorServices,
  type ApiResult,
} from "@/lib/api";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "success" | "error";

interface EndpointState {
  status: Status;
  result: ApiResult | null;
}

const initialState = (): EndpointState => ({ status: "idle", result: null });

// ── Small UI atoms ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    idle:    { label: "IDLE",    cls: styles.badgeIdle },
    loading: { label: "TESTING", cls: styles.badgeLoading },
    success: { label: "OK",      cls: styles.badgeOk },
    error:   { label: "FAIL",    cls: styles.badgeFail },
  };
  const { label, cls } = map[status];
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function Latency({ ms }: { ms: number | null }) {
  if (ms === null) return null;
  const cls = ms < 200 ? styles.fast : ms < 800 ? styles.medium : styles.slow;
  return <span className={`${styles.latency} ${cls}`}>{ms}ms</span>;
}

function JsonViewer({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;
  return (
    <pre className={styles.json}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Endpoint Card ─────────────────────────────────────────────────────────────

function EndpointCard({
  method,
  path,
  label,
  description,
  state,
  onRun,
  children,
}: {
  method: "GET" | "POST";
  path: string;
  label: string;
  description: string;
  state: EndpointState;
  onRun: () => void;
  children?: React.ReactNode;
}) {
  const { status, result } = state;

  return (
    <div className={`${styles.card} ${styles[`card_${status}`]}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <span className={styles.method}>{method}</span>
          <code className={styles.path}>{path}</code>
          <StatusBadge status={status} />
          {result && <Latency ms={result.latencyMs} />}
        </div>
        <div className={styles.cardTitle}>
          <h3>{label}</h3>
          <p>{description}</p>
        </div>
      </div>

      {children && <div className={styles.cardInputs}>{children}</div>}

      <div className={styles.cardActions}>
        <button
          className={styles.runBtn}
          onClick={onRun}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <span className={styles.spinner} />
          ) : (
            "▶ Run"
          )}
        </button>
      </div>

      {result && (
        <div className={styles.cardResult}>
          <div className={styles.resultMeta}>
            <span className={result.ok ? styles.httpOk : styles.httpErr}>
              HTTP {result.status ?? "—"}
            </span>
            {result.error && (
              <span className={styles.errorMsg}>{result.error}</span>
            )}
          </div>
          <JsonViewer data={result.data ?? result.error} />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "(not set — add to .env.local)";

  // Per-endpoint state
  const [health,   setHealth]   = useState<EndpointState>(initialState);
  const [username, setUsername] = useState<EndpointState>(initialState);
  const [vendors,  setVendors]  = useState<EndpointState>(initialState);
  const [services, setServices] = useState<EndpointState>(initialState);

  // Inputs
  const [usernameInput, setUsernameInput] = useState("testuser");
  const [tokenInput,    setTokenInput]    = useState(
    process.env.NEXT_PUBLIC_API_TOKEN || ""
  );

  // Run all at once
  const [runningAll, setRunningAll] = useState(false);

  const run = useCallback(
    async (
      setter: React.Dispatch<React.SetStateAction<EndpointState>>,
      fn: () => Promise<ApiResult>
    ) => {
      setter({ status: "loading", result: null });
      const result = await fn();
      setter({ status: result.ok ? "success" : "error", result });
    },
    []
  );

  const runAll = async () => {
    setRunningAll(true);
    await Promise.all([
      run(setHealth,   checkHealth),
      run(setUsername, () => checkUsername(usernameInput)),
      run(setVendors,  getVendors),
      run(setServices, () => getVendorServices(tokenInput)),
    ]);
    setRunningAll(false);
  };

  const allStatuses = [health.status, username.status, vendors.status, services.status];
  const successCount = allStatuses.filter(s => s === "success").length;
  const failCount    = allStatuses.filter(s => s === "error").length;
  const hasRun       = allStatuses.some(s => s !== "idle");

  return (
    <main className={styles.main}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.logo}>
            <span className={styles.logoVercel}>▲ Vercel</span>
            <span className={styles.logoArrow}>⟷</span>
            <span className={styles.logoAws}>AWS RDS</span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.envLabel}>API BASE</span>
            <code className={styles.envValue}>{apiBase}</code>
          </div>
        </div>
        <h1 className={styles.title}>Connection Tester</h1>
        <p className={styles.subtitle}>
          Verify your Vercel frontend can reach the AWS VPC backend across all endpoints.
        </p>
      </header>

      {/* ── Summary bar ── */}
      {hasRun && (
        <div className={styles.summary}>
          <div className={`${styles.summaryItem} ${styles.summaryOk}`}>
            <span className={styles.summaryCount}>{successCount}</span>
            <span>passed</span>
          </div>
          <div className={`${styles.summaryItem} ${styles.summaryFail}`}>
            <span className={styles.summaryCount}>{failCount}</span>
            <span>failed</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryCount}>{4 - successCount - failCount}</span>
            <span>pending</span>
          </div>
        </div>
      )}

      {/* ── Run all ── */}
      <div className={styles.toolbar}>
        <button
          className={styles.runAllBtn}
          onClick={runAll}
          disabled={runningAll}
        >
          {runningAll ? (
            <><span className={styles.spinner} /> Running all tests…</>
          ) : (
            "▶▶ Run All Tests"
          )}
        </button>
      </div>

      {/* ── Endpoint cards ── */}
      <div className={styles.grid}>

        {/* Health */}
        <EndpointCard
          method="GET"
          path="/api/v1/health"
          label="Health Check"
          description="Confirms the backend server is reachable from Vercel."
          state={health}
          onRun={() => run(setHealth, checkHealth)}
        />

        {/* Username check */}
        <EndpointCard
          method="GET"
          path="/api/v1/username/check"
          label="Username Availability"
          description="Queries the RDS database to check if a username is taken."
          state={username}
          onRun={() => run(setUsername, () => checkUsername(usernameInput))}
        >
          <label className={styles.inputLabel}>
            <span>username</span>
            <input
              className={styles.input}
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              placeholder="e.g. johndoe"
              spellCheck={false}
            />
          </label>
        </EndpointCard>

        {/* Vendors */}
        <EndpointCard
          method="GET"
          path="/api/v1/vendors"
          label="Vendors List"
          description="Fetches the public vendors list from the database."
          state={vendors}
          onRun={() => run(setVendors, getVendors)}
        />

        {/* Vendor services (protected) */}
        <EndpointCard
          method="GET"
          path="/api/v1/vendor-services"
          label="Vendor Services"
          description="Protected route — requires a Bearer token. Tests auth middleware."
          state={services}
          onRun={() => run(setServices, () => getVendorServices(tokenInput))}
        >
          <label className={styles.inputLabel}>
            <span>Bearer token</span>
            <input
              className={styles.input}
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
              type="password"
              spellCheck={false}
            />
          </label>
          <p className={styles.hint}>
            Set <code>NEXT_PUBLIC_API_TOKEN</code> in your <code>.env.local</code> to prefill this.
          </p>
        </EndpointCard>
      </div>

      {/* ── Setup guide ── */}
      <section className={styles.guide}>
        <h2 className={styles.guideTitle}>Setup Checklist</h2>
        <div className={styles.guideGrid}>
          <div className={styles.guideStep}>
            <span className={styles.guideNum}>01</span>
            <div>
              <strong>.env.local</strong>
              <p>Copy <code>.env.example</code> → <code>.env.local</code> and set <code>NEXT_PUBLIC_API_BASE_URL</code> to your AWS backend URL (EC2, ALB, or API Gateway).</p>
            </div>
          </div>
          <div className={styles.guideStep}>
            <span className={styles.guideNum}>02</span>
            <div>
              <strong>Vercel Env Vars</strong>
              <p>In Vercel Dashboard → Project → Settings → Environment Variables, add the same vars. They're needed at build time and runtime.</p>
            </div>
          </div>
          <div className={styles.guideStep}>
            <span className={styles.guideNum}>03</span>
            <div>
              <strong>AWS Security Group</strong>
              <p>Allow inbound traffic from Vercel's IP ranges on your EC2/ALB security group. Vercel publishes its egress IPs — or use 0.0.0.0/0 for testing only.</p>
            </div>
          </div>
          <div className={styles.guideStep}>
            <span className={styles.guideNum}>04</span>
            <div>
              <strong>CORS on Backend</strong>
              <p>Ensure your backend allows <code>https://your-app.vercel.app</code> as an allowed origin, or use <code>*</code> during testing.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Vercel ↔ AWS Connection Tester</span>
        <span className={styles.footerDim}>Built for VPC connectivity validation</span>
      </footer>
    </main>
  );
}
