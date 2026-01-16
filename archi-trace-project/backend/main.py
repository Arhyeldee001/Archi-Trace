import os
from fastapi import FastAPI, Depends, Form, UploadFile, File, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User
from passlib.context import CryptContext
from uuid import uuid4
import shutil

# ------------------ Setup ------------------
Base.metadata.create_all(bind=engine)
app = FastAPI(title="Archi Trace Backend")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session secret key
import os
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123")  # Fallback for local
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Paths - UPDATED FOR NEW STRUCTURE
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Go up one level
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
AVATAR_FOLDER = os.path.join(FRONTEND_DIR, "avatars")
os.makedirs(AVATAR_FOLDER, exist_ok=True)

# Static folders - UPDATED
app.mount("/static/avatars", StaticFiles(directory=AVATAR_FOLDER), name="avatars")
app.mount("/static/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/static/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
# Templates - UPDATED
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))

# ------------------ DB Dependency ------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------ Routes ------------------
@app.get("/")
def root(request: Request):
    if request.session.get("user_id"):
        return RedirectResponse("/dashboard")
    return RedirectResponse("/login")

# ------------------ Login ------------------
@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password[:72], user.password_hash):
        return templates.TemplateResponse("login.html", {"request": request, "error": "Invalid credentials"})
    request.session["user_id"] = user.id
    return RedirectResponse("/dashboard", status_code=303)

# ------------------ Signup ------------------
@app.get("/signup")
def signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@app.post("/signup")
def signup(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    avatar: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # Check duplicate
    existing = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing:
        return JSONResponse(
            status_code=400,
            content={"detail": "Username or email already exists"}
        )

    hashed_password = pwd_context.hash(password[:72])

    avatar_filename = None
    if avatar and avatar.filename:
        ext = os.path.splitext(avatar.filename)[1]
        avatar_filename = f"{uuid4().hex}{ext}"
        avatar_path = os.path.join(AVATAR_FOLDER, avatar_filename)
        with open(avatar_path, "wb") as f:
            shutil.copyfileobj(avatar.file, f)

    new_user = User(
        username=username,
        email=email,
        password_hash=hashed_password,
        avatar=avatar_filename
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return JSONResponse(
        status_code=201,
        content={"message": "Signup successful"}
    )

# ------------------ Dashboard User ------------------
@app.get("/dashboard-user")
def dashboard_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")
    if not user_id:
        return JSONResponse({"error": "not logged in"}, status_code=401)
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "id": user.id,
        "username": user.username,
        "avatar": user.avatar
    }

# ------------------ Update Profile ------------------
@app.post("/update-profile")
async def update_profile(
    request: Request,
    username: str = Form(...),
    avatar: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    user_id = request.session.get("user_id")
    if not user_id:
        return JSONResponse({"error": "not logged in"}, status_code=401)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return JSONResponse({"error": "user not found"}, status_code=404)

    user.username = username

    if avatar:
        # Remove old avatar
        if user.avatar:
            old_path = os.path.join(AVATAR_FOLDER, user.avatar)
            if os.path.exists(old_path):
                os.remove(old_path)
        # Save new avatar
        ext = os.path.splitext(avatar.filename)[1]
        avatar_filename = f"{uuid4().hex}{ext}"
        avatar_path = os.path.join(AVATAR_FOLDER, avatar_filename)
        with open(avatar_path, "wb") as f:
            shutil.copyfileobj(avatar.file, f)
        user.avatar = avatar_filename

    db.commit()
    db.refresh(user)
    return JSONResponse({
        "id": user.id,
        "username": user.username,
        "avatar": user.avatar
    })

# ------------------ Dashboard Page ------------------
@app.get("/dashboard")
def dashboard(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")
    if not user_id:
        return RedirectResponse("/login", status_code=303)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        request.session.clear()
        return RedirectResponse("/login", status_code=303)

    return templates.TemplateResponse(
        "index.html",
        {"request": request, "user": user}
    )

# ------------------ Tracer ------------------
@app.get("/tracer")
def tracer(request: Request):
    return templates.TemplateResponse("tracer.html", {"request": request})

# ------------------ Tutorials ------------------
@app.get("/tutorials")
def tutorials(request: Request):
    return templates.TemplateResponse("tutorials.html", {"request": request})

# ------------------ Logout ------------------
@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login")
