# ocr_server.py
# FastAPI OCR microservice for receipt photos (RO + EN) with rectification
# Requires: fastapi, uvicorn, easyocr, opencv-python, numpy, pytesseract, python-multipart

import base64
import io
import os
import re
from typing import List, Tuple

import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from easyocr import Reader

# ----------------------------
# Config
# ----------------------------

ALLOW_ORIGINS = os.getenv("OCR_CORS", "*").split(",")
USE_GPU = os.getenv("OCR_GPU", "0") in ("1", "true", "TRUE")

# Initialize OCR reader (download models on first run)
# If GPU isn't available in your env, set USE_GPU=0
READER = Reader(["ro", "en"], gpu=USE_GPU)

app = FastAPI(title="Receipt OCR API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Image utilities
# ----------------------------

def _ordered_corners(pts: np.ndarray) -> np.ndarray:
    pts = np.array(pts, dtype="float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    return np.array(
        [
            pts[np.argmin(s)],      # top-left
            pts[np.argmin(diff)],   # top-right
            pts[np.argmax(diff)],   # bottom-left
            pts[np.argmax(s)],      # bottom-right
        ],
        dtype="float32",
    )


def rectify_receipt(img_bgr: np.ndarray) -> np.ndarray:
    """
    Find the largest quadrilateral (the paper), warp to bird's-eye,
    then apply strong binarization and sharpening tailored for receipts.
    Returns a single-channel (grayscale/binary) image.
    """
    h, w = img_bgr.shape[:2]
    scale = 900.0 / max(h, w)
    small = (
        cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        if scale < 1.0
        else img_bgr.copy()
    )

    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge map & contours
    th = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 17, 10
    )
    edges = cv2.Canny(th, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        gray0 = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        return gray0

    cnt = max(cnts, key=cv2.contourArea)
    peri = cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

    if len(approx) == 4:
        inv = 1.0 / scale if scale < 1.0 else 1.0
        quad = (approx.reshape(4, 2) * inv).astype("float32")
        quad = _ordered_corners(quad)

        widthA = np.linalg.norm(quad[2] - quad[3])
        widthB = np.linalg.norm(quad[1] - quad[0])
        heightA = np.linalg.norm(quad[1] - quad[3])
        heightB = np.linalg.norm(quad[0] - quad[2])
        maxW = int(max(widthA, widthB))
        maxH = int(max(heightA, heightB))
        s_up = 1400.0 / max(maxW, maxH)
        maxW = int(maxW * s_up)
        maxH = int(maxH * s_up)

        dst = np.array([[0, 0], [maxW - 1, 0], [0, maxH - 1], [maxW - 1, maxH - 1]], dtype="float32")
        M = cv2.getPerspectiveTransform(quad, dst)
        warped = cv2.warpPerspective(img_bgr, M, (maxW, maxH), flags=cv2.INTER_CUBIC)
        gray_w = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    else:
        gray_w = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Contrast + sharpen
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(gray_w)
    blur = cv2.GaussianBlur(cl, (0, 0), 1.0)
    sharp = cv2.addWeighted(cl, 1.6, blur, -0.6, 0)

    # Binarize & close gaps
    bin_img = cv2.adaptiveThreshold(
        sharp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 12
    )
    bin_img = cv2.morphologyEx(bin_img, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
    return bin_img


def run_ocr(
    image_bgr: np.ndarray,
    paragraph: bool = False,
    mag_ratio: float = 2.2,
    text_th: float = 0.6,
    low_text: float = 0.3,
):
    """
    Preprocess + EasyOCR with robust tuple/dict handling.
    Falls back to Tesseract if output is too short.
    Returns (text, results, preprocessed_image)
    """
    prep = rectify_receipt(image_bgr)

    results = READER.readtext(
        prep,
        detail=1,
        paragraph=paragraph,
        text_threshold=float(text_th),
        low_text=float(low_text),
        mag_ratio=float(mag_ratio),
        decoder="beamsearch",
        beamWidth=5,
    )

    # Group by line (approx by y)
    line_map = {}
    for r in results:
        if isinstance(r, dict):
            box, txt = r.get("box"), r.get("text", "")
        elif isinstance(r, (list, tuple)):
            # easyocr often returns (box, text, conf) or (box, text)
            box, txt = r[0], r[1]
        else:
            continue

        if not txt or not str(txt).strip():
            continue

        try:
            y = int(sum(p[1] for p in box) / 4) // 20
        except Exception:
            y = 0
        line_map.setdefault(y, []).append((box, str(txt)))

    lines: List[str] = []
    for k in sorted(line_map):
        row = sorted(line_map[k], key=lambda t: min(p[0] for p in t[0]))
        lines.append(" ".join(t[1] for t in row).strip())

    text = "\n".join(lines).strip()

    # Fallback to Tesseract if EasyOCR is too weak
    if len(text.splitlines()) < 3 or len(text) < 15:
        try:
            config = "--oem 1 --psm 6 -l ron+eng"
            t_text = pytesseract.image_to_string(prep, config=config)
            if len(t_text.strip()) > len(text.strip()):
                text = t_text
        except Exception:
            pass

    # Clean up whitespace
    text = re.sub(r"[^\S\r\n]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    return text, results, prep


# ----------------------------
# Routes
# ----------------------------

@app.get("/health")
async def health():
    return {"ok": True, "gpu": USE_GPU}


@app.post("/ocr")
async def ocr(
    file: UploadFile = File(...),
    lang: str = Query("ro+en"),      # kept for UI compatibility; EasyOCR uses ['ro','en'] above
    pre: int = Query(1),             # 1 = enable preprocessing (always on in this build)
):
    try:
        raw = await file.read()
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return JSONResponse({"ok": False, "error": "Invalid image"}, status_code=400)

        text, results, pre_img = run_ocr(img, paragraph=False)

        # small preview of rectified image for debugging (optional)
        _, pre_jpg = cv2.imencode(".jpg", pre_img)
        pre_b64 = base64.b64encode(pre_jpg.tobytes()).decode("ascii")

        return {
            "ok": True,
            "text": text,
            "debug": {
                "lines": text.splitlines(),
                "rectified_preview_jpg_b64": pre_b64,
                "n_regions": len(results),
            },
        }
    except Exception as e:
        print("OCR error:", e)
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)


# ----------------------------
# Local dev entry
# ----------------------------

if __name__ == "__main__":
    import uvicorn

    # Allow: OCR_GPU=1 python ocr_server.py to try GPU if available
    print(f"EasyOCR initialized. GPU={USE_GPU}")
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)
