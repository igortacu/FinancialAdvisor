# ocr_server.py
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import easyocr
import numpy as np
import cv2

app = FastAPI()

# CORS + Private Network (for Chrome PNA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
class PrivateNetworkMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        resp: Response = await call_next(request)
        resp.headers["Access-Control-Allow-Private-Network"] = "true"
        return resp
app.add_middleware(PrivateNetworkMiddleware)

# health endpoint (your UI pings this)
@app.get("/health")
def health():
    return {"ok": True}

# ---------- EasyOCR init (RO + EN) ----------
# gpu=False keeps it simple on any box; swap to True if you have CUDA set up
READER = easyocr.Reader(['ro', 'en'], gpu=False)

def imread_bytes(b: bytes) -> np.ndarray:
    arr = np.frombuffer(b, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

def preprocess(img: np.ndarray, enabled: bool) -> np.ndarray:
    if not enabled:
        return img
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # denoise + contrast + adaptive binarization (good for thermal receipts)
    blur = cv2.bilateralFilter(gray, 9, 75, 75)
    norm = cv2.normalize(blur, None, 0, 255, cv2.NORM_MINMAX)
    thr = cv2.adaptiveThreshold(norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                cv2.THRESH_BINARY, 31, 10)
    return thr  # EasyOCR accepts 1-channel images too

def ocr_text(img: np.ndarray, min_conf: float) -> str:
    # detail=1 → list of (bbox, text, conf)
    results = READER.readtext(img, detail=1, paragraph=False)
    # Sort by top-left Y, then X so lines are in reading order
    results.sort(key=lambda r: (min(pt[1] for pt in r[0]), min(pt[0] for pt in r[0])))
    lines = [text for (box, text, conf) in results if float(conf) >= min_conf]
    return "\n".join(lines)

@app.post("/ocr")
async def ocr(
    file: UploadFile = File(...),     # the UI sends "file"
    lang: str = Query("ro+en"),       # accepted for UI compatibility (not used)
    pre: bool = Query(False),         # enable our preprocessing
    min_conf: float = Query(0.82)     # filter low-confidence spans
):
    data = await file.read()
    img = imread_bytes(data)
    img2 = preprocess(img, pre)
    text = ocr_text(img2, min_conf)
    return {"text": text}
