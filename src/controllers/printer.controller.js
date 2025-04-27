import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"

// Obtenir le profil d'imprimeur
export const getPrinterProfile = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Vérifier si l'utilisateur est un imprimeur
    if (req.user.role !== "PRINTER") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un imprimeur")
    }

    const printerProfile = await prisma.printerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            phoneNumber: true,
          },
        },
      },
    })

    if (!printerProfile) {
      throw new ApiError(404, "Profil d'imprimeur non trouvé")
    }

    return sendResponse(res, {
      data: printerProfile,
    })
  } catch (error) {
    next(error)
  }
}

// Mettre à jour le profil d'imprimeur
export const updatePrinterProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { companyName, address, capabilities } = req.body

    // Vérifier si l'utilisateur est un imprimeur
    if (req.user.role !== "PRINTER") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un imprimeur")
    }

    // Vérifier si le profil existe
    const existingProfile = await prisma.printerProfile.findUnique({
      where: { userId },
    })

    if (!existingProfile) {
      // Créer un nouveau profil
      const newProfile = await prisma.printerProfile.create({
        data: {
          userId,
          companyName,
          address,
          capabilities: capabilities ? JSON.parse(capabilities) : [],
        },
      })

      return sendResponse(res, {
        statusCode: 201,
        data: newProfile,
        message: "Profil d'imprimeur créé avec succès",
      })
    }

    // Mettre à jour le profil existant
    const updatedProfile = await prisma.printerProfile.update({
      where: { userId },
      data: {
        companyName,
        address,
        capabilities: capabilities ? JSON.parse(capabilities) : undefined,
      },
    })

    return sendResponse(res, {
      data: updatedProfile,
      message: "Profil d'imprimeur mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir les commandes assignées à l'imprimeur
export const getPrinterOrders = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, status } = req.query

    // Vérifier si l'utilisateur est un imprimeur
    if (req.user.role !== "PRINTER") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un imprimeur")
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {
      printerId: userId,
    }

    if (status) {
      where.status = status
    }

    // Compter le nombre total de commandes
    const total = await prisma.order.count({ where })

    // Récupérer les commandes
    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        items: {
          include: {
            artwork: true,
          },
        },
        shippingDetails: true,
        statusHistory: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      skip,
      take: Number.parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    })

    return sendResponse(res, {
      data: {
        orders,
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

// Mettre à jour le statut d'une commande (imprimeur)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, comment } = req.body

    // Vérifier si l'utilisateur est un imprimeur
    if (req.user.role !== "PRINTER") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un imprimeur")
    }

    // Vérifier si le statut est valide
    const validStatuses = ["PRINTING", "READY_FOR_SHIPPING"]

    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Statut invalide pour un imprimeur")
    }

    // Vérifier si la commande existe et est assignée à cet imprimeur
    const order = await prisma.order.findFirst({
      where: {
        id,
        printerId: req.user.id,
      },
    })

    if (!order) {
      throw new ApiError(404, "Commande non trouvée ou non assignée à cet imprimeur")
    }

    // Mettre à jour le statut
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            comment: comment || `Statut mis à jour vers ${status}`,
            createdBy: req.user.id,
          },
        },
      },
    })

    // Envoyer une notification au client (via le service de notification)

    return sendResponse(res, {
      data: updatedOrder,
      message: "Statut de la commande mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir les statistiques de l'imprimeur
export const getPrinterStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Vérifier si l'utilisateur est un imprimeur
    if (req.user.role !== "PRINTER") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un imprimeur")
    }

    // Compter le nombre de commandes par statut
    const orderStats = await prisma.order.groupBy({
      where: {
        printerId: userId,
      },
      by: ["status"],
      _count: {
        id: true,
      },
    })

    // Calculer le nombre total de commandes traitées
    const completedOrders = await prisma.order.count({
      where: {
        printerId: userId,
        status: {
          in: ["READY_FOR_SHIPPING", "SHIPPED", "DELIVERED"],
        },
      },
    })

    // Calculer le nombre de commandes en cours
    const pendingOrders = await prisma.order.count({
      where: {
        printerId: userId,
        status: "PRINTING",
      },
    })

    return sendResponse(res, {
      data: {
        orderStats,
        completedOrders,
        pendingOrders,
      },
    })
  } catch (error) {
    next(error)
  }
}
