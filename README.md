# 🔐 Secure Archiver – Projet de stockage sécurisé local

Ce projet permet de stocker **chaque donnée** dans une **archive ZIP chiffrée AES-256** et d’enregistrer ses **métadonnées** dans une base de données locale **protégée par mot de passe utilisateur**. Chaque archive a un mot de passe unique, chiffré dans la BDD.

> 🔒 Objectif : sécurité locale, archivage structuré, déconnexion automatique après inactivité.

---

## 📁 Structure du projet

```
/secure-archiver/
├── backend/
│   ├── server.js               ← Serveur Node.js (API)
│   ├── auth.js                 ← Authentification JWT
│   ├── zipManager.js           ← Gestion ZIP AES-256
│   ├── metadata.db             ← Base SQLite chiffrée
│   └── config.js               ← Configuration globale
├── frontend/
│   └── src/
│       ├── App.js              ← Interface React
│       ├── components/
│       │   ├── Login.js
│       │   ├── UploadForm.js
│       │   ├── ArchiveList.js
│       │   └── TimerLogout.js
│       └── services/api.js     ← Appels au backend
```

---

## 🧰 Installation

### Backend

```bash
npm init -y
npm install express bcryptjs jsonwebtoken multer adm-zip sqlite3 crypto cors
```

### Frontend

```bash
npx create-react-app frontend
cd frontend
npm install axios
```

---

## 🔐 Fonctionnement général

- L’utilisateur se connecte via un mot de passe.
- Chaque donnée ajoutée est transformée en une archive ZIP, puis chiffrée avec AES-256.
- Un mot de passe unique est généré pour chaque archive.
- Ce mot de passe est chiffré avec une clé dérivée du mot de passe utilisateur, et stocké dans une BDD SQLite locale.
- Les métadonnées (nom, date, chemin) sont stockées dans cette BDD.
- Après X minutes d’inactivité, la session est automatiquement invalidée.

---

## ⚙️ Backend (Node.js)

### 🔑 `auth.js`

- Hashage de mot de passe avec `bcrypt`
- Authentification avec `jsonwebtoken`
- Middleware de session avec expiration (ex: 10 minutes)
- Clé de session dans `config.js`

### 📦 `zipManager.js`

- Création d’archives ZIP avec `adm-zip`
- Chiffrement AES-256 avec `crypto`
- Génération aléatoire de mot de passe pour chaque archive
- Utilisation de `crypto.pbkdf2` pour chiffrer ce mot de passe avec le mot de passe utilisateur

### 🧠 Base SQLite (`metadata.db`)

Chaque enregistrement contient :
- `id`
- `nom_du_fichier`
- `chemin_archive`
- `mot_de_passe_chiffré`
- `date_creation`

### 🔁 API REST

| Endpoint         | Description                                 |
|------------------|---------------------------------------------|
| POST `/login`    | Authentifie l’utilisateur                   |
| POST `/upload`   | Enregistre une nouvelle donnée (archive)    |
| GET `/archives`  | Liste des archives stockées                |
| GET `/download/:id` | Télécharge et déchiffre une archive     |

---

## 🌐 Frontend (React)

### 🧑‍💼 `Login.js`

- Formulaire de connexion
- Stocke le token JWT en mémoire

### ⬆️ `UploadForm.js`

- Formulaire pour uploader un fichier ou texte
- Appel à `POST /upload`

### 📂 `ArchiveList.js`

- Affiche les archives disponibles
- Permet de les télécharger ou déchiffrer

### ⏳ `TimerLogout.js`

- Déconnecte automatiquement l’utilisateur après inactivité

---

## 🛡️ Sécurité

- Aucun mot de passe en clair stocké
- Archive chiffrée en AES-256
- Mot de passe unique par archive
- Mot de passe d’archive chiffré dans la base avec une clé dérivée du mot de passe utilisateur (`pbkdf2`)
- Nettoyage mémoire et fichiers temporaires
- Déconnexion automatique

---

## ✅ À tester

- Connexion/Déconnexion
- Ajout de données et vérification des fichiers ZIP chiffrés
- Vérification que les archives ne sont accessibles qu’après authentification
- Fonctionnement du timer de session

---
