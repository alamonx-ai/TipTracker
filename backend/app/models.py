from pydantic import BaseModel, EmailStr

# 🚨 Vérifie que l'orthographe est EXACTEMENT celle-ci :
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Modèle pour ajouter un quart (Shift) - On en aura besoin pour le Jour 3-4
class ShiftCreate(BaseModel):
    date: str
    hours_worked: float
    sales: float
    tips: float
    hourly_wage: float