import express from "express"
import { body } from "express-validator"
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateSubscription,
  deleteAccount,
} from "../controllers/user.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"
import { upload } from "../middlewares/upload.middleware.js"

const router = express.Router()

// Validation pour la mise à jour du profil
const updateProfileValidation = [
  body("firstName").optional().notEmpty().withMessage("Le prénom ne peut pas être vide"),
  body("lastName").optional().notEmpty().withMessage("Le nom ne peut pas être vide"),
  body("phoneNumber").optional().isMobilePhone().withMessage("Numéro de téléphone invalide"),
]

// Validation pour le changement de mot de passe
const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Le mot de passe actuel est requis"),
  body("newPassword").isLength({ min: 6 }).withMessage("Le nouveau mot de passe doit contenir au moins 6 caractères"),
]

// Routes
router.get("/profile", authenticate, getUserProfile)
router.put(
  "/profile",
  authenticate,
  upload.single("profileImage"),
  updateProfileValidation,
  validate,
  updateUserProfile,
)
router.put("/change-password", authenticate, changePasswordValidation, validate, changePassword)
router.put(
  "/subscription",
  authenticate,
  body("subscription").isIn(["FREE", "PREMIUM"]).withMessage("Type d'abonnement invalide"),
  validate,
  updateSubscription,
)
router.delete("/account", authenticate, deleteAccount)

export default router
