// app/trigger/cropImage.ts
import { task } from "@trigger.dev/sdk";
import sharp from "sharp";

/**
 * Crops an image to a given aspect ratio.
 *
 * The node stores aspectRatio as a string like "1:1", "16:9", "4:3".
 * The imageUrl can be an HTTPS URL OR a base64 data URL (data:image/...;base64,...).
 */
export const cropImageTask = task({
  id: "crop-image-task",
  run: async (payload: {
    imageUrl: string;
    aspectRatio?: string; // e.g. "1:1", "16:9", "4:3"
    // Legacy pixel-based params (kept for backwards compat but not required)
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => {
    console.log(
      `CropImage task started. aspectRatio=${payload.aspectRatio}, url starts with: ${payload.imageUrl.slice(0, 60)}`
    );

    
    // ── 1. Fetch image buffer ───────────────────────────────────────
    let inputBuffer: Buffer;

    if (payload.imageUrl.startsWith("data:")) {
      // base64 data URL — extract the raw base64 part
      const base64Data = payload.imageUrl.split(",")[1];
      if (!base64Data) {
        throw new Error("Invalid base64 data URL: no data after comma");
      }
      inputBuffer = Buffer.from(base64Data, "base64");
    } else {
      // Regular HTTPS/HTTP URL
      const response = await fetch(payload.imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        );
      }
      inputBuffer = Buffer.from(await response.arrayBuffer());
    }

    // ── 2. Get image dimensions ─────────────────────────────────────
    const metadata = await sharp(inputBuffer).metadata();
    const imgWidth = metadata.width ?? 0;
    const imgHeight = metadata.height ?? 0;

    if (imgWidth === 0 || imgHeight === 0) {
      throw new Error("Could not determine image dimensions");
    }

    // ── 3. Derive crop box from aspect ratio ────────────────────────
    let left = 0;
    let top = 0;
    let cropWidth = imgWidth;
    let cropHeight = imgHeight;

    const aspectRatio = payload.aspectRatio || "1:1";
    const [rw, rh] = aspectRatio.split(":").map(Number);

    if (rw && rh) {
      const targetRatio = rw / rh;
      const currentRatio = imgWidth / imgHeight;

      if (currentRatio > targetRatio) {
        // Image is wider than target — crop the sides
        cropHeight = imgHeight;
        cropWidth = Math.round(imgHeight * targetRatio);
        left = Math.round((imgWidth - cropWidth) / 2);
        top = 0;
      } else {
        // Image is taller than target — crop the top/bottom
        cropWidth = imgWidth;
        cropHeight = Math.round(imgWidth / targetRatio);
        left = 0;
        top = Math.round((imgHeight - cropHeight) / 2);
      }
    }

    console.log(
      `Cropping ${imgWidth}x${imgHeight} → left=${left}, top=${top}, width=${cropWidth}, height=${cropHeight} (ratio ${aspectRatio})`
    );

    // ── 4. Perform crop ─────────────────────────────────────────────
    const croppedBuffer = await sharp(inputBuffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 85 })
      .toBuffer();

    // ── 5. Return as base64 data URL (immediately usable in browser) ─
    const base64 = croppedBuffer.toString("base64");
    const croppedImageUrl = `data:image/jpeg;base64,${base64}`;

    console.log(`CropImage task complete. Output size: ${croppedBuffer.length} bytes`);
    return { croppedImageUrl };
  },
});