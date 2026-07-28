import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(135deg, #7c6fff, #00e5ff)",
        }}
      >
        <span style={{ fontSize: 100, fontWeight: 800, color: "#0a0b10" }}>A</span>
      </div>
    ),
    { ...size }
  );
}
