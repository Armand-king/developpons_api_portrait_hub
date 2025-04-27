import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { uploadImage } from "../services/upload.service.js"
import { generateAiImage } from "../services/ai.service.js"

// Générer une image avec l'IA
export const generateImage = async (req, res, next) => {
  try {
    const { prompt } = req.body
    const userId = req.user.id

    // Vérifier si l'utilisateur est premium pour la génération d'images
    if (req.user.subscription !== "PREMIUM") {
      throw new ApiError(403, "La génération d'images par IA nécessite un abonnement premium")
    }

    // Gérer l'upload d'image de référence si présent
    let referenceImageUrl = null
    if (req.file) {
      referenceImageUrl = await uploadImage(req.file)
    }

    // Créer une demande de génération
    const aiRequest = await prisma.aiGenerationRequest.create({
      data: {
        prompt,
        imageUrl: referenceImageUrl,
        userId,
      },
    })

    // Simuler la génération d'image (dans un environnement réel, cela serait asynchrone)
    const generatedImageUrl = await generateAiImage(prompt, referenceImageUrl)

    // Mettre à jour la demande avec l'image générée
    const updatedRequest = await prisma.aiGenerationRequest.update({
      where: { id: aiRequest.id },
      data: {
        resultImageUrl: generatedImageUrl,
        status: "COMPLETED",
      },
    })

    return sendResponse(res, {
      data: updatedRequest,
      message: "Image générée avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir l'historique des générations d'images
export const getGenerationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Compter le nombre total de générations
    const total = await prisma.aiGenerationRequest.count({
      where: { userId },
    })

    // Récupérer les générations
    const generations = await prisma.aiGenerationRequest.findMany({
      where: { userId },
      skip,
      take: Number.parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    })

    return sendResponse(res, {
      data: {
        generations,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          pages: Math.ceil(total / Number.parseInt(limit)),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir une génération par ID
export const getGenerationById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const generation = await prisma.aiGenerationRequest.findUnique({
      where: { id },
    })

    if (!generation) {
      throw new ApiError(404, "Génération non trouvée")
    }

    // Vérifier si l'utilisateur est autorisé
    if (generation.userId !== userId && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Vous n'êtes pas autorisé à voir cette génération")
    }

    return sendResponse(res, {
      data: generation,
    })
  } catch (error) {
    next(error)
  }
}
