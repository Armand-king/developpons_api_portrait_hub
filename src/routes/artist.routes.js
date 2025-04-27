import express from "express"
import {
  getArtistProfile,
  updateArtistProfile,
  getArtistArtworks,
  getArtistOrders,
  getArtistStats,
} from "../controllers/artist.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Routes pour le profil d'artiste
router.get("/profile", authenticate, authorize("ARTIST"), getArtistProfile)
router.put("/profile", authenticate, authorize("ARTIST"), updateArtistProfile)

// Routes pour les œuvres d'un artiste
router.get("/:artistId/artworks", getArtistArtworks)

// Routes pour les commandes d'un artiste
router.get("/orders", authenticate, authorize("ARTIST"), getArtistOrders)

// Statistiques de l'artiste
router.get("/stats", authenticate, authorize("ARTIST"), getArtistStats)

export default router
