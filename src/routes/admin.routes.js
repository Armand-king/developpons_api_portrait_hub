import express from "express"
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllOrders,
  getDashboardStats,
} from "../controllers/admin.controller.js"
import { authenticate, authorize } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Toutes les routes nécessitent l'authentification et le rôle ADMIN
router.use(authenticate, authorize("ADMIN"))

// Routes utilisateurs
router.get("/users", getAllUsers)
router.get("/users/:id", getUserById)
router.put("/users/:id", updateUser)
router.delete("/users/:id", deleteUser)

// Routes commandes
router.get("/orders", getAllOrders)

// Statistiques du tableau de bord
router.get("/dashboard", getDashboardStats)

export default router
