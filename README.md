# Art and Déco – Portrait Hub API

API REST pour la plateforme "Art and Déco – Portrait Hub", dédiée à la personnalisation et la vente d'œuvres d'art (portraits, tableaux, impressions, IA, etc.).

## Technologies utilisées

- **Framework**: Node.js avec Express.js
- **Base de données**: PostgreSQL
- **ORM**: Prisma
- **Authentification**: JWT (avec Bcrypt pour le hash des mots de passe)
- **Stockage**: Cloudinary pour les images
- **Paiement**: Intégration Airtel Money et Moov Money (simulée)
- **Notifications**: Nodemailer pour les emails + hooks pour WhatsApp (simulé)
- **Architecture**: MVC (Model-View-Controller)

## Installation

1. Cloner le dépôt
\`\`\`bash
git clone https://github.com/votre-username/art-and-deco-api.git
cd art-and-deco-api
\`\`\`

2. Installer les dépendances
\`\`\`bash
npm install
\`\`\`

3. Configurer les variables d'environnement
\`\`\`bash
cp .env.example .env

# Modifier les valeurs dans le fichier .env
\`\`\`

4. Créer la base de données et exécuter les migrations
\`\`\`bash
npx prisma migrate dev
\`\`\`

5. Démarrer le serveur
\`\`\`bash
npm run dev
\`\`\`

## Structure du projet

\`\`\`
art-and-deco-api/
├── prisma/                  # Schéma Prisma et migrations
├── src/
│   ├── controllers/         # Contrôleurs pour chaque entité
│   ├── middlewares/         # Middlewares (auth, error, validation, etc.)
│   ├── routes/              # Routes API
│   ├── services/            # Services (email, upload, payment, etc.)
│   ├── utils/               # Utilitaires
│   └── server.js            # Point d'entrée de l'application
├── uploads/                 # Dossier temporaire pour les uploads
├── .env.example             # Exemple de variables d'environnement
├── package.json
└── README.md
\`\`\`

## Endpoints API

### Authentification

- `POST /api/auth/register` ok - Inscription d'un nouvel utilisateur
- `POST /api/auth/login` - Connexion d'un utilisateur
- `GET /api/auth/verify-email/:token` - Vérification de l'email
- `POST /api/auth/forgot-password` - Demande de réinitialisation de mot de passe
- `POST /api/auth/reset-password/:token` - Réinitialisation du mot de passe
- `GET /api/auth/me` - Obtenir l'utilisateur actuel

### Utilisateurs

- `GET /api/users/profile` - Obtenir le profil de l'utilisateur
- `PUT /api/users/profile` - Mettre à jour le profil de l'utilisateur
- `PUT /api/users/change-password` - Changer le mot de passe
- `PUT /api/users/subscription` - Mettre à jour l'abonnement
- `DELETE /api/users/account` - Supprimer le compte

### Œuvres d'art

- `GET /api/artworks` - Obtenir toutes les œuvres d'art
- `GET /api/artworks/:id` - Obtenir une œuvre d'art par ID
- `POST /api/artworks` - Créer une nouvelle œuvre d'art
- `PUT /api/artworks/:id` - Mettre à jour une œuvre d'art
- `DELETE /api/artworks/:id` - Supprimer une œuvre d'art
- `PATCH /api/artworks/:id/status` - Approuver ou rejeter une œuvre d'art

### Commandes

- `POST /api/orders` - Créer une nouvelle commande
- `GET /api/orders` - Obtenir toutes les commandes de l'utilisateur
- `GET /api/orders/:id` - Obtenir une commande par ID
- `POST /api/orders/:id/cancel` - Annuler une commande
- `PATCH /api/orders/:id/status` - Mettre à jour le statut d'une commande
- `POST /api/orders/:id/assign` - Assigner une commande à un imprimeur

### Paiements

- `POST /api/payments/initiate` - Initialiser un paiement
- `POST /api/payments/confirm` - Confirmer un paiement (webhook)
- `GET /api/payments/status/:orderId` - Vérifier le statut d'un paiement

### Administration

- `GET /api/admin/users` - Obtenir tous les utilisateurs
- `GET /api/admin/users/:id` - Obtenir un utilisateur par ID
- `PUT /api/admin/users/:id` - Mettre à jour un utilisateur
- `DELETE /api/admin/users/:id` - Supprimer un utilisateur
- `GET /api/admin/orders` - Obtenir toutes les commandes
- `GET /api/admin/dashboard` - Obtenir les statistiques du tableau de bord

### Artistes

- `GET /api/artists/profile` - Obtenir le profil d'artiste
- `PUT /api/artists/profile` - Mettre à jour le profil d'artiste
- `GET /api/artists/:artistId/artworks` - Obtenir les œuvres d'un artiste
- `GET /api/artists/orders` - Obtenir les commandes d'un artiste
- `GET /api/artists/stats` - Obtenir les statistiques de l'artiste

### Imprimeurs

- `GET /api/printers/profile` - Obtenir le profil d'imprimeur
- `PUT /api/printers/profile` - Mettre à jour le profil d'imprimeur
- `GET /api/printers/orders` - Obtenir les commandes assignées à l'imprimeur
- `PATCH /api/printers/orders/:id/status` - Mettre à jour le statut d'une commande
- `GET /api/printers/stats` - Obtenir les statistiques de l'imprimeur

### IA

- `POST /api/ai/generate` - Générer une image avec l'IA
- `GET /api/ai/history` - Obtenir l'historique des générations d'images
- `GET /api/ai/history/:id` - Obtenir une génération par ID

### Notifications

- `GET /api/notifications` - Obtenir les notifications de l'utilisateur
- `PATCH /api/notifications/:id/read` - Marquer une notification comme lue
- `POST /api/notifications/whatsapp` - Envoyer une notification WhatsApp

## Exemples de requêtes

### Inscription d'un utilisateur

\`\`\`bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+22912345678",
    "role": "CLIENT"
  }'
\`\`\`

### Connexion

\`\`\`bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
\`\`\`

### Création d'une œuvre d'art (artiste)

\`\`\`bash
curl -X POST http://localhost:3000/api/artworks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "title=Mon portrait" \
  -F "description=Un magnifique portrait" \
  -F "type=PORTRAIT" \
  -F "price=15000" \
  -F "isCustomizable=true" \
  -F "isPrintable=true" \
  -F "tags=[\"portrait\", \"art\", \"peinture\"]" \
  -F "image=@/path/to/image.jpg"
\`\`\`

### Création d'une commande

\`\`\`bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "artworkId": "artwork_id_here",
        "quantity": 1,
        "customizations": {
          "frame": "wooden",
          "size": "medium"
        }
      }
    ],
    "shippingDetails": {
      "address": "123 Rue Principale",
      "city": "Cotonou",
      "country": "Bénin",
      "postalCode": "12345",
      "contactPhone": "+22912345678"
    }
  }'
\`\`\`

## Licence

Ce projet est sous licence MIT.
