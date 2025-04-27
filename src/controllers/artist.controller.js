import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"

// Obtenir le profil d'artiste
export const getArtistProfile = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Vérifier si l'utilisateur est un artiste
    if (req.user.role !== "ARTIST") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un artiste")
    }

    const artistProfile = await prisma.artistProfile.findUnique({
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

    if (!artistProfile) {
      throw new ApiError(404, "Profil d'artiste non trouvé")
    }

    return sendResponse(res, {
      data: artistProfile,
    })
  } catch (error) {
    next(error)
  }
}

// Mettre à jour le profil d'artiste
export const updateArtistProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { bio, specialties, portfolioUrl } = req.body

    // Vérifier si l'utilisateur est un artiste
    if (req.user.role !== "ARTIST") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un artiste")
    }

    // Vérifier si le profil existe
    const existingProfile = await prisma.artistProfile.findUnique({
      where: { userId },
    })

    if (!existingProfile) {
      // Créer un nouveau profil
      const newProfile = await prisma.artistProfile.create({
        data: {
          userId,
          bio,
          specialties: specialties ? JSON.parse(specialties) : [],
          portfolioUrl,
        },
      })

      return sendResponse(res, {
        statusCode: 201,
        data: newProfile,
        message: "Profil d'artiste créé avec succès",
      })
    }

    // Mettre à jour le profil existant
    const updatedProfile = await prisma.artistProfile.update({
      where: { userId },
      data: {
        bio,
        specialties: specialties ? JSON.parse(specialties) : undefined,
        portfolioUrl,
      },
    })

    return sendResponse(res, {
      data: updatedProfile,
      message: "Profil d'artiste mis à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Obtenir les œuvres d'un artiste
export const getArtistArtworks = async (req, res, next) => {
  try {
    const { artistId } = req.params
    const { page = 1, limit = 10, status } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {
      artistId,
    }

    // Si l'utilisateur n'est pas l'artiste lui-même ou un admin, ne montrer que les œuvres approuvées
    if (req.user.id !== artistId && req.user.role !== "ADMIN") {
      where.status = "APPROVED"
    } else if (status) {
      where.status = status
    }

    // Compter le nombre total d'œuvres
    const total = await prisma.artwork.count({ where })

    // Récupérer les œuvres
    const artworks = await prisma.artwork.findMany({
      where,
      include: {
        categories: true,
        customizationOptions: true,
      },
      skip,
      take: Number.parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    })

    return sendResponse(res, {
      data: {
        artworks,
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

// Obtenir les commandes d'un artiste
export const getArtistOrders = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, status } = req.query

    // Vérifier si l'utilisateur est un artiste
    if (req.user.role !== "ARTIST") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un artiste")
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres pour trouver les commandes contenant des œuvres de l'artiste
    const where = {
      items: {
        some: {
          artwork: {
            artistId: userId,
          },
        },
      },
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
          },
        },
        items: {
          where: {
            artwork: {
              artistId: userId,
            },
          },
          include: {
            artwork: true,
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

// Obtenir les statistiques de l'artiste
export const getArtistStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Vérifier si l'utilisateur est un artiste
    if (req.user.role !== "ARTIST") {
      throw new ApiError(403, "Accès non autorisé. Vous n'êtes pas un artiste")
    }

    // Compter le nombre d'œuvres par statut
    const artworkStats = await prisma.artwork.groupBy({
      where: {
        artistId: userId,
      },
      by: ["status"],
      _count: {
        id: true,
      },
    })

    // Compter le nombre de commandes contenant des œuvres de l'artiste
    const orderCount = await prisma.order.count({
      where: {
        items: {
          some: {
            artwork: {
              artistId: userId,
            },
          },
        },
      },
    })

    // Calculer le montant total des ventes
    const salesData = await prisma.orderItem.aggregate({
      where: {
        artwork: {
          artistId: userId,
        },
        order: {
          status: {
            in: [
              "PAYMENT_RECEIVED",
              "PROCESSING",
              "CUSTOMIZING",
              "PRINTING",
              "READY_FOR_SHIPPING",
              "SHIPPED",
              "DELIVERED",
            ],
          },
        },
      },
      _sum: {
        unitPrice: true,
      },
      _count: {
        id: true,
      },
    })

    return sendResponse(res, {
      data: {
        artworkStats,
        orderCount,
        salesCount: salesData._count.id,
        totalSales: salesData._sum.unitPrice || 0,
      },
    })
  } catch (error) {
    next(error)
  }
}
