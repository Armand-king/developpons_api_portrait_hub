import express from "express"
import { body } from "express-validator"
import {
  getAllArtworks,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  updateArtworkStatus,
} from "../controllers/artwork.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"
import { upload } from "../middlewares/upload.middleware.js"

const router = express.Router()

// Validation pour la création d'une œuvre
const createArtworkValidation = [
  body("title").notEmpty().withMessage("Le titre est requis"),
  body("type").isIn(["PORTRAIT", "PAINTING", "PRINT", "AI_GENERATED", "CUSTOM"]).withMessage("Type d'œuvre invalide"),
  body("price").isFloat({ min: 0 }).withMessage("Le prix doit être un nombre positif"),
]

// Routes
router.get("/", getAllArtworks)
router.get("/:id", getArtworkById)
router.post(
  "/",
  authenticate,
  authorize("ARTIST", "ADMIN"),
  upload.single("image"),
  createArtworkValidation,
  validate,
  createArtwork,
)
router.put("/:id", authenticate, authorize("ARTIST", "ADMIN"), upload.single("image"), validate, updateArtwork)
router.delete("/:id", authenticate, authorize("ARTIST", "ADMIN"), deleteArtwork)
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  body("status").isIn(["APPROVED", "REJECTED"]).withMessage("Statut invalide"),
  validate,
  updateArtworkStatus,
)

export default router
