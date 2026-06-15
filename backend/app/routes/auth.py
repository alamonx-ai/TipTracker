from fastapi import APIRouter, HTTPException, status, Depends 
from fastapi.security import OAuth2PasswordRequestForm
from app.database import db
from app.models import UserRegister, UserLogin
from app.auth import hash_password, verify_password, create_access_token
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(user_data: UserRegister):
    # Vérifier si l'utilisateur existe déjà
    existing_user = db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé."
        )
    
    # Hacher le mot de passe avant la sauvegarde
    hashed = hash_password(user_data.password)
    
    # Créer l'objet utilisateur
    new_user = {
        "email": user_data.email,
        "passwordHash": hashed,
        "createdAt": datetime.utcnow()
    }
    
    # Insérer dans MongoDB
    db.users.insert_one(new_user)
    
    return {"message": "Utilisateur créé avec succès ! Tu peux maintenant te connecter."}


@router.post("/login")
async def login(user_data: OAuth2PasswordRequestForm = Depends()):
    # Trouver l'utilisateur dans la DB
    user = db.users.find_one({"email": user_data.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiants incorrects (email introuvable)."
        )
    
    # Vérifier le mot de passe
    if not verify_password(user_data.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiants incorrects (mauvais mot de passe)."
        )
    
    # Générer le token d'accès
    access_token = create_access_token(data={"sub": str(user["_id"]), "email": user["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Connexion réussie !"
    }