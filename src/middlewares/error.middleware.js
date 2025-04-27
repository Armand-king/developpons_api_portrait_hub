import { ApiError } from "../utils/api-error.js"

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  // Si l'erreur est une instance de ApiError, on utilise ses propriétés
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    })
  }

  // Erreurs Prisma
  if (err.code) {
    // Erreur de contrainte unique (ex: email déjà utilisé)
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `Un enregistrement avec ce ${err.meta?.target?.join(", ")} existe déjà`,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      })
    }

    // Erreur d'enregistrement non trouvé
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Ressource non trouvée",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      })
    }
  }

  // Erreur par défaut
  return res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  })
}
