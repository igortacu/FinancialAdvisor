from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import tiktoken
import os
from classify import GPTModel, eval, id2label

app = FastAPI()

# Configuration
BASE_CONFIG = {
    "vocab_size": 50257,
    "context_length": 1024,
    "emb_dim": 768,
    "n_heads": 12,
    "n_layers": 12,
    "drop_rate": 0.0,
    "qkv_bias": True
}

# Global model and tokenizer
model = None
tokenizer = None
device = "cuda" if torch.cuda.is_available() else "cpu"

def load_model():
    global model, tokenizer
    model = GPTModel(BASE_CONFIG)
    num_classes = 16
    model.out_head = torch.nn.Linear(in_features=BASE_CONFIG["emb_dim"], out_features=num_classes)
    
    # Load weights
    # Assuming the .pth file is in the same directory
    model_path = os.path.join(os.path.dirname(__file__), "category_classifier.pth")
    if not os.path.exists(model_path):
        print(f"Warning: Model file not found at {model_path}")
        return

    model_state_dict = torch.load(model_path, map_location=device, weights_only=True)
    model.load_state_dict(model_state_dict)
    model.to(device)
    model.eval()
    
    tokenizer = tiktoken.get_encoding("gpt2")
    print("Model loaded successfully")

@app.on_event("startup")
async def startup_event():
    load_model()

class ClassificationRequest(BaseModel):
    text: str

class ClassificationResponse(BaseModel):
    category: str

@app.post("/classify", response_model=ClassificationResponse)
async def classify_text(request: ClassificationRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        category = eval(request.text, model, tokenizer, device)
        return ClassificationResponse(category=category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}
