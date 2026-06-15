from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import db
from app.routes import auth, shifts


app = FastAPI(title="Tip Tracker API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(shifts.router)

@app.get("/")
def read_root():
    return {"status": "L'API Tip Tracker fonctionne parfaitement !"}