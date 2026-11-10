const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function generateIcons() {
  const svgPath = path.join(__dirname, "../public/favicon.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, "../public/icon-192.png"));
  console.log("Generated public/icon-192.png");

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, "../public/icon-512.png"));
  console.log("Generated public/icon-512.png");

  // Generate apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, "../public/apple-touch-icon.png"));
  console.log("Generated public/apple-touch-icon.png");
}

generateIcons().catch(console.error);
