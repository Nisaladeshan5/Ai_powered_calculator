from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from apps.calculator.route import router as calculator_router

SERVER_URL = "0.0.0.0"  # or "localhost"
PORT = 8900
ENV = "dev"

app = FastAPI()

# Allow CORS from any origin (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins, change in prod!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Server is running"}

# Mount the calculator router at /calculate
app.include_router(calculator_router, prefix="/calculate", tags=["calculate"])

if __name__ == "__main__":
    uvicorn.run("main:app", host=SERVER_URL, port=PORT, reload=(ENV=="dev"))
