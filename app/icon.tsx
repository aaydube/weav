import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #7C3AED 0%, #5B21B6 100%)",
          borderRadius: 7,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
          <path
            d="M27 7 L20.5 25 L14.5 12.5"
            stroke="white"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 7 L11.5 25 L15.4 16.875"
            stroke="white"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.6 14.375 L17.5 12.5"
            stroke="white"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
