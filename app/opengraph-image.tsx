import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Scope — AI Visibility Platform by Marcstrat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glows */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,111,255,0.22) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 44 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "linear-gradient(135deg, #7c6fff, #00e5ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            AI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#ffffff", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
              AI Scope
            </span>
            <span style={{ color: "#666", fontSize: 17 }}>by Marcstrat</span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 20,
            maxWidth: 920,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#ffffff" }}>Know Where Your Brand Stands</span>
          <span style={{ color: "#555", fontSize: 40, fontWeight: 600 }}>in the AI Age</span>
        </div>

        {/* Subtext */}
        <div
          style={{
            color: "#777",
            fontSize: 22,
            textAlign: "center",
            maxWidth: 680,
            lineHeight: 1.5,
            marginBottom: 52,
          }}
        >
          Audit your AI Visibility across ChatGPT, Claude, Perplexity, Gemini & 10 more AI systems
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 14 }}>
          {["14+ AI Bots Checked", "3 Providers Simultaneously", "Results in &lt; 60s", "Free to Start"].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: "rgba(0,229,255,0.07)",
                  border: "1px solid rgba(0,229,255,0.25)",
                  borderRadius: 100,
                  padding: "11px 22px",
                  color: "#00e5ff",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
