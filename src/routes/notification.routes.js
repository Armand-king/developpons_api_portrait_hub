import express from "express"
import { body } from "express-validator"
import {
  getUserNotifications,
  markNotificationAsRead,
  sendWhatsAppNotification,
} from "../controllers/notification.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"
import { validate } from "../middlewares/validation.middleware.js"

const router = express.Router()

// Validation pour l'envoi de notification WhatsApp
const sendWhatsAppValidation = [
  body("userId").notEmpty().withMessage("L'ID de l'utilisateur est requis"),
  body("message").notEmpty().withMessage("Le message est requis"),
]

// Routes
router.get("/", authenticate, getUserNotifications)
router.patch("/:id/read", authenticate, markNotificationAsRead)
router.post("/whatsapp", authenticate, authorize("ADMIN"), sendWhatsAppValidation, validate, sendWhatsAppNotification)

export default router
