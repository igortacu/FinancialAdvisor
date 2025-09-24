// ocr-api/index.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sharp = require("sharp");
const Tesseract = require("tesseract.js");

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// --- helpers ---
function upsampleIfSmall(meta, img) {
  // Upsample to ~2000px tall for small photos (improves glyph shapes)
  const targetH = 2000;
  if (!meta || !meta.height || meta.height >= targetH) return img;
  const w = Math.round((meta.width * targetH) / meta.height);
  return img.resize({
    width: w,
    height: targetH,
    kernel: sharp.kernel.nearest,
  });
}

async function preprocess(buf, mode /* 'soft' | 'hard' */) {
  let img = sharp(buf).rotate(); // auto-orient by EXIF

  const meta = await img.metadata();
  img = upsampleIfSmall(meta, img);

  // Common steps
  img = img
    .grayscale()
    .normalise() // boost contrast
    .sharpen();

  // Two flavors: soft keeps gradients; hard binarizes
  if (mode === "hard") {
    img = img.threshold(190); // try 180–210 depending on receipts
  } else {
    img = img.gamma(1.1); // slight gamma helps ink
  }

  return await img.toFormat("png").toBuffer();
}

// Base OCR options tuned for receipts
const OCR_OPTS_BASE = {
  // Recognize both Romanian + English terms
  // You can add 'osd' if orientation is unknown, but we already rotate by EXIF.
  // lang is passed at call site.
  // Tesseract parameters:
  tessedit_pageseg_mode: "6", // PSM 6: single uniform block
  preserve_interword_spaces: "1",
  // Use whitelist to reduce spurious punctuation in prices
  tessedit_char_whitelist:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.,:%/×x BUCkgKGlL",
  // Speed/accuracy tradeoffs:
  load_system_dawg: "F",
  load_freq_dawg: "F",
};

// Harder pass focuses on digits and separators
const OCR_OPTS_NUMERIC = {
  tessedit_pageseg_mode: "6",
  preserve_interword_spaces: "1",
  tessedit_char_whitelist: "0123456789-.,x× ",
  load_system_dawg: "F",
  load_freq_dawg: "F",
};

async function recognizeBuffer(buf, lang, opts) {
  const { data } = await Tesseract.recognize(buf, lang, opts);
  return data?.text || "";
}

function mergeByLongest(a, b) {
  // crude merge: pick the text with more characters
  return (a || "").length >= (b || "").length ? a : b;
}

app.post("/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file_missing" });

    const lang =
      typeof req.query.lang === "string" ? req.query.lang : "ron+eng";

    // Two passes, two preprocess variants
    const softBuf = await preprocess(req.file.buffer, "soft");
    const hardBuf = await preprocess(req.file.buffer, "hard");

    const [softText, hardText, numText] = await Promise.all([
      recognizeBuffer(softBuf, lang, OCR_OPTS_BASE),
      recognizeBuffer(hardBuf, lang, OCR_OPTS_BASE),
      recognizeBuffer(hardBuf, lang, OCR_OPTS_NUMERIC), // digits-focused
    ]);

    // Merge: prefer the richer between soft/hard; append numeric clues for totals
    const merged = mergeByLongest(softText, hardText);
    const text = [merged, "\n\n", numText].join("");

    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ocr_failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`OCR API on http://localhost:${port}`));
