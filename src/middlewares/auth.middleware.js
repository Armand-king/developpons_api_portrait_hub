import jwt from "jsonwebtoken"
import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"

// Middleware pour vérifier le token JWT
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentification requise")
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
      throw new ApiError(401, "Token non fourni")
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      throw new ApiError(401, "Utilisateur non trouvé")
    }

    // Ajouter l'utilisateur à l'objet de requête
    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Token invalide"))
    }
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Token expiré"))
    }
    next(error)
  }
}

// Middleware pour vérifier les rôles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentification requise"))
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Accès non autorisé"))
    }

    next()
  }
}

// Middleware pour vérifier si l'utilisateur est premium (pour les fonctionnalités IA)
export const isPremiumUser = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentification requise"))
  }

  if (req.user.subscription !== "PREMIUM") {
    return next(new ApiError(403, "Cette fonctionnalité nécessite un abonnement premium"))
  }

  next()
}
