import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)

# 🚨 Vérifie cette ligne exacte : elle doit créer 'db' en minuscules !
db = client["tip_tracker"]

try:
    client.admin.command('ping')
    print("✅ Connexion réussie à MongoDB Atlas !")
except Exception as e:
    print(f"❌ Erreur de connexion MongoDB : {e}")