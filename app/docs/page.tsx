"use client";

import { useEffect } from "react";

export default function DocsPage() {
  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css";
    document.head.appendChild(link);

    // Load SwaggerUIBundle first, then StandalonePreset, then init
    const script1 = document.createElement("script");
    script1.src = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js";
    script1.onload = () => {
      const script2 = document.createElement("script");
      script2.src = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.min.js";
      script2.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        w.SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          presets: [w.SwaggerUIBundle.presets.apis, w.SwaggerUIStandalonePreset],
          layout: "StandaloneLayout",
          deepLinking: true,
          displayRequestDuration: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 2,
          docExpansion: "list",
          filter: true,
          tryItOutEnabled: true,
          persistAuthorization: true,
          syntaxHighlight: { activated: true, theme: "agate" },
        });
      };
      document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
  }, []);

  return (
    <>
      <style>{`
        /* ── Hard-reset Tailwind/globals interference ── */
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #0f1117 !important;
          color: #e2e8f0 !important;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
          min-height: 100vh;
        }

        /* ── Hide Swagger's own top bar (we have our own) ── */
        .swagger-ui .topbar { display: none !important; }

        /* ── Our custom header ── */
        .aiscope-header {
          background: linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%);
          border-bottom: 1px solid rgba(99,102,241,0.25);
          padding: 16px 32px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 1px 20px rgba(0,0,0,0.4);
        }
        .aiscope-logo {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(90deg, #818cf8, #a78bfa, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.5px;
        }
        .aiscope-badge {
          background: rgba(99,102,241,0.2);
          border: 1px solid rgba(99,102,241,0.4);
          color: #818cf8;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 9px;
          border-radius: 20px;
        }
        .aiscope-cors {
          margin-left: auto;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          color: #34d399;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .aiscope-cors::before { content: "● "; font-size: 8px; }

        /* ── Swagger UI wrapper ── */
        #swagger-ui {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 24px 80px;
        }

        /* ── Fix Swagger UI wrapper backgrounds ── */
        .swagger-ui .wrapper,
        .swagger-ui .scheme-container {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          max-width: 100% !important;
        }

        /* ── Info block ── */
        .swagger-ui .info {
          background: linear-gradient(135deg, #1a1f2e, #1e2435) !important;
          border: 1px solid rgba(99,102,241,0.2) !important;
          border-radius: 16px !important;
          padding: 28px 32px !important;
          margin-bottom: 28px !important;
        }
        .swagger-ui .info .title {
          font-size: 26px !important;
          font-weight: 800 !important;
          color: #818cf8 !important;
        }
        .swagger-ui .info .title small.version-stamp {
          background: rgba(99,102,241,0.2) !important;
          border: 1px solid rgba(99,102,241,0.35) !important;
          color: #818cf8 !important;
          -webkit-text-fill-color: #818cf8 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 2px 9px !important;
          border-radius: 20px !important;
        }
        .swagger-ui .info p,
        .swagger-ui .info li,
        .swagger-ui .info .description p { color: #94a3b8 !important; font-size: 14px; line-height: 1.6; }
        .swagger-ui .info a { color: #818cf8 !important; }

        /* ── Tag group headers ── */
        .swagger-ui .opblock-tag {
          background: rgba(30,36,53,0.6) !important;
          border: 1px solid rgba(99,102,241,0.15) !important;
          border-radius: 12px !important;
          padding: 14px 20px !important;
          margin-bottom: 8px !important;
          color: #e2e8f0 !important;
          font-size: 16px !important;
          font-weight: 700 !important;
        }
        .swagger-ui .opblock-tag:hover { background: rgba(99,102,241,0.1) !important; }
        .swagger-ui .opblock-tag small { color: #64748b !important; font-size: 13px; font-weight: 400; }

        /* ── Operation blocks ── */
        .swagger-ui .opblock {
          border-radius: 12px !important;
          margin-bottom: 10px !important;
          overflow: hidden !important;
          background: rgba(30,36,53,0.5) !important;
          border: 1px solid rgba(99,102,241,0.1) !important;
        }
        .swagger-ui .opblock:hover { border-color: rgba(99,102,241,0.3) !important; }

        .swagger-ui .opblock.opblock-post {
          border-color: rgba(16,185,129,0.25) !important;
          background: rgba(16,185,129,0.04) !important;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #059669 !important; }
        .swagger-ui .opblock.opblock-post .opblock-summary { border-color: rgba(16,185,129,0.2) !important; }

        .swagger-ui .opblock.opblock-get {
          border-color: rgba(56,189,248,0.25) !important;
          background: rgba(56,189,248,0.04) !important;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #0284c7 !important; }
        .swagger-ui .opblock.opblock-get .opblock-summary { border-color: rgba(56,189,248,0.2) !important; }

        .swagger-ui .opblock.opblock-options { border-color: rgba(148,163,184,0.15) !important; }
        .swagger-ui .opblock.opblock-options .opblock-summary-method { background: #475569 !important; }

        .swagger-ui .opblock-summary-description { color: #94a3b8 !important; font-size: 13px; }
        .swagger-ui .opblock-summary-path,
        .swagger-ui .opblock-summary-path .nostyle { color: #e2e8f0 !important; font-weight: 600 !important; font-size: 15px !important; }

        .swagger-ui .opblock-body { background: rgba(15,17,23,0.8) !important; }
        .swagger-ui .opblock-description-wrapper p,
        .swagger-ui .parameter__name,
        .swagger-ui .parameter__type,
        .swagger-ui label,
        .swagger-ui .tab li,
        .swagger-ui .response-col_status,
        .swagger-ui .response-col_description p { color: #94a3b8 !important; }

        /* ── Buttons ── */
        .swagger-ui .btn.try-out__btn {
          background: rgba(99,102,241,0.15) !important;
          border: 1px solid rgba(99,102,241,0.4) !important;
          color: #818cf8 !important;
          border-radius: 8px !important;
          font-weight: 600;
        }
        .swagger-ui .btn.execute {
          background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
          border: none !important;
          color: #fff !important;
          border-radius: 8px !important;
          font-weight: 700;
        }
        .swagger-ui .btn.btn-clear { color: #94a3b8 !important; }

        /* ── Inputs ── */
        .swagger-ui input[type="text"],
        .swagger-ui textarea,
        .swagger-ui select {
          background: rgba(30,36,53,0.9) !important;
          border: 1px solid rgba(99,102,241,0.25) !important;
          color: #e2e8f0 !important;
          border-radius: 8px !important;
        }

        /* ── Code blocks ── */
        .swagger-ui .highlight-code,
        .swagger-ui pre,
        .swagger-ui code {
          background: rgba(15,17,23,0.9) !important;
          border-radius: 8px !important;
          color: #a5f3fc !important;
          font-size: 12.5px;
        }
        .swagger-ui .microlight { color: #a5f3fc !important; }

        /* ── Schemas ── */
        .swagger-ui section.models {
          background: rgba(30,36,53,0.4) !important;
          border: 1px solid rgba(99,102,241,0.15) !important;
          border-radius: 16px !important;
          padding: 20px !important;
          margin-top: 32px;
        }
        .swagger-ui section.models h4 { color: #e2e8f0 !important; font-size: 17px !important; font-weight: 700 !important; }
        .swagger-ui .model-container { background: rgba(15,17,23,0.6) !important; border-radius: 10px !important; }
        .swagger-ui .model-title { color: #818cf8 !important; font-size: 14px !important; font-weight: 700 !important; }
        .swagger-ui .model, .swagger-ui .model span { color: #94a3b8 !important; }
        .swagger-ui .prop-type { color: #34d399 !important; }

        /* ── Tables ── */
        .swagger-ui table { background: transparent !important; }
        .swagger-ui table thead tr th { color: #64748b !important; border-bottom: 1px solid rgba(99,102,241,0.15) !important; background: transparent !important; }
        .swagger-ui table tbody tr td { color: #94a3b8 !important; background: transparent !important; }

        /* ── Filter input ── */
        .swagger-ui .filter .operation-filter-input {
          background: rgba(30,36,53,0.8) !important;
          border: 1px solid rgba(99,102,241,0.25) !important;
          color: #e2e8f0 !important;
          border-radius: 8px !important;
        }

        /* ── SVG arrows ── */
        .swagger-ui .expand-methods svg,
        .swagger-ui .expand-operation svg,
        .swagger-ui button svg,
        .swagger-ui .arrow { fill: #64748b !important; }

        /* ── Custom scrollbar ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <div className="aiscope-header">
        <span className="aiscope-logo">⬡ AiScope</span>
        <span className="aiscope-badge">API v2.0</span>
        <span className="aiscope-cors">CORS Enabled</span>
      </div>

      <div id="swagger-ui" />
    </>
  );
}