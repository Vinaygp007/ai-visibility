import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b10",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #7c6fff, #00e5ff)",
            }}
          >
            <span style={{ fontSize: 40, fontWeight: 800, color: "#0a0b10" }}>A</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: "#f5f6fa" }}>AiScope</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: "#8a8fa3" }}>By Marcstrat</span>
          </div>
        </div>

        <span
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: "#f5f6fa",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: 24,
          }}
        >
          Is Your Website Visible to AI?
        </span>

        <span style={{ fontSize: 26, color: "#8a8fa3", textAlign: "center", marginBottom: 40 }}>
          Audit how ChatGPT, Perplexity, Gemini and more discover and reference your site.
        </span>

        <div style={{ display: "flex", gap: 16 }}>
          {["Gemini", "ChatGPT", "Perplexity"].map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                color: "#00e5ff",
                background: "rgba(0,229,255,0.1)",
                border: "1px solid rgba(0,229,255,0.3)",
                borderRadius: 12,
                padding: "10px 22px",
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
