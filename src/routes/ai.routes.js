import express from "express"
import { body } from "express-validator"
import { generateImage, getGenerationHistory, getGenerationById } from "../controllers/ai.controller.js"
import { authenticate, isPremiumUser } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"
import { upload } from "../middlewares/upload.middleware.js"

const router = express.Router()

// Validation pour la génération d'image
const generateImageValidation = [body("prompt").notEmpty().withMessage("Le prompt est requis")]

// Routes
router.post(
  "/generate",
  authenticate,
  isPremiumUser,
  upload.single("referenceImage"),
  generateImageValidation,
  validate,
  generateImage,
)
router.get("/history", authenticate, getGenerationHistory)
router.get("/history/:id", authenticate, getGenerationById)

export default router
