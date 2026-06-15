from fastapi import APIRouter, Depends, HTTPException, status
from app.database import db
from app.models import ShiftCreate
from app.auth import ALGORITHM, JWT_SECRET
from fastapi.security import OAuth2PasswordBearer
import jwt
from bson import ObjectId

router = APIRouter(prefix="/shifts", tags=["Shifts"])

# Outil de FastAPI pour extraire le jeton de sécurité de la requête
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Fonction utilitaire pour récupérer l'ID de l'utilisateur connecté via son Token
async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée ou invalide")


# 🟢 1. Route pour AJOUTER un shift
@router.post("/")
async def add_shift(shift_data: ShiftCreate, user_id: str = Depends(get_current_user_id)):
    # On prépare le dictionnaire à insérer dans Mongo en attachant l'ID de l'utilisateur
    new_shift = shift_data.dict()
    new_shift["user_id"] = user_id
    
    # Insertion dans la collection "shifts"
    result = db.shifts.insert_one(new_shift)
    
    return {"message": "Shift enregistré avec succès !", "shift_id": str(result.inserted_id)}


# 🔵 2. Route pour RÉCUPÉRER tous les shifts de l'utilisateur connecté
@router.get("/")
async def get_shifts(user_id: str = Depends(get_current_user_id)):
    # On cherche uniquement les shifts qui appartiennent à CET utilisateur
    cursor = db.shifts.find({"user_id": user_id})
    
    shifts_list = []
    for shift in cursor:
        shift["_id"] = str(shift["_id"]) # Convertit l'ID Mongo en string lisible pour le JSON
        shifts_list.append(shift)
        
    return shifts_list

@router.put("/{shift_id}")
async def update_shift(shift_id: str, shift_data: ShiftCreate, user_id: str = Depends(get_current_user_id)):
    # 🔒 Sécurité : On cherche le shift ET on vérifie qu'il appartient bien à l'utilisateur connecté
    query = {"_id": ObjectId(shift_id), "user_id": user_id}
    
    # Les nouvelles données envoyées par le frontend
    update_data = {"$set": shift_data.dict()}
    
    result = db.shifts.update_one(query, update_data)
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Shift introuvable ou vous n'avez pas l'autorisation de le modifier."
        )
        
    return {"message": "Shift mis à jour avec succès !"}


# 🔴 4. Route pour SUPPRIMER un shift
@router.delete("/{shift_id}")
async def delete_shift(shift_id: str, user_id: str = Depends(get_current_user_id)):
    # 🔒 Sécurité : On s'assure d'effacer le shift SEULEMENT s'il appartient à cet utilisateur
    query = {"_id": ObjectId(shift_id), "user_id": user_id}
    
    result = db.shifts.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Shift introuvable ou vous n'avez pas l'autorisation de le supprimer."
        )
        
    return {"message": "Shift supprimé avec succès !"}