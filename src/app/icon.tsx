import { ImageResponse } from "next/og";

// Two overlapping circles — violet + teal, the app's two accent colors —
// meeting in the middle: two speakers/two languages, connected by the call.
export const size = { width: 256, height: 256 };
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
          background: "#5B21B6",
          borderRadius: 56,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 168,
            height: 112,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 112,
              height: 112,
              borderRadius: "50%",
              background: "#0891B2",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 112,
              height: 112,
              borderRadius: "50%",
              background: "#FFFFFF",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
