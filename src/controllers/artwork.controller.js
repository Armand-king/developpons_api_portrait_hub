import { prisma } from "../server.js"
import { ApiError } from "../utils/api-error.js"
import { sendResponse } from "../utils/api-response.js"
import { uploadImage } from "../services/upload.service.js"

// Obtenir toutes les œuvres d'art
export const getAllArtworks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      search,
      artistId,
      isPrintable,
      isCustomizable,
      status = "APPROVED",
    } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    // Construire les filtres
    const where = {
      status: status,
    }

    if (type) {
      where.type = type
    }

    if (artistId) {
      where.artistId = artistId
    }

    if (isPrintable !== undefined) {
      where.isPrintable = isPrintable === "true"
    }

    if (isCustomizable !== undefined) {
      where.isCustomizable = isCustomizable === "true"
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Si une catégorie est spécifiée
    if (category) {
      where.categories = {
        some: {
          name: category,
        },
      }
    }

    // Compter le nombre total d'œuvres
    const total = await prisma.artwork.count({ where })

    // Récupérer les œuvres
    const artworks = await prisma.artwork.findMany({
      where,
      include: {
        artist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
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

// Obtenir une œuvre d'art par ID
export const getArtworkById = async (req, res, next) => {
  try {
    const { id } = req.params

    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            artistProfile: true,
          },
        },
        categories: true,
        customizationOptions: true,
      },
    })

    if (!artwork) {
      throw new ApiError(404, "Œuvre d'art non trouvée")
    }

    return sendResponse(res, {
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
}

// Créer une nouvelle œuvre d'art
export const createArtwork = async (req, res, next) => {
  try {
    const { title, description, type, price, isCustomizable, isPrintable, tags, categories, customizationOptions } =
      req.body

    // Vérifier si l'utilisateur est un artiste ou un admin
    if (req.user.role !== "ARTIST" && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Seuls les artistes et les administrateurs peuvent créer des œuvres")
    }

    // Gérer l'upload d'image
    if (!req.file) {
      throw new ApiError(400, "Une image est requise pour l'œuvre d'art")
    }

    const imageUrl = await uploadImage(req.file)

    // Créer l'œuvre d'art
    const artwork = await prisma.artwork.create({
      data: {
        title,
        description,
        imageUrl,
        type,
        price: Number.parseFloat(price),
        isCustomizable: isCustomizable === "true",
        isPrintable: isPrintable === "true",
        tags: tags ? JSON.parse(tags) : [],
        status: req.user.role === "ADMIN" ? "APPROVED" : "PENDING_APPROVAL",
        artist: {
          connect: { id: req.user.id },
        },
        categories: {
          connect: categories ? JSON.parse(categories).map((id) => ({ id })) : [],
        },
      },
    })

    // Ajouter les options de personnalisation si présentes
    if (customizationOptions) {
      const options = JSON.parse(customizationOptions)

      for (const option of options) {
        await prisma.customizationOption.create({
          data: {
            name: option.name,
            type: option.type,
            options: option.options,
            artwork: {
              connect: { id: artwork.id },
            },
          },
        })
      }
    }

    // Récupérer l'œuvre créée avec toutes ses relations
    const createdArtwork = await prisma.artwork.findUnique({
      where: { id: artwork.id },
      include: {
        categories: true,
        customizationOptions: true,
      },
    })

    return sendResponse(res, {
      statusCode: 201,
      data: createdArtwork,
      message: "Œuvre d'art créée avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Mettre à jour une œuvre d'art
export const updateArtwork = async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, type, price, isCustomizable, isPrintable, tags, categories, customizationOptions } =
      req.body

    // Vérifier si l'œuvre existe
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: {
        categories: true,
        customizationOptions: true,
      },
    })

    if (!artwork) {
      throw new ApiError(404, "Œuvre d'art non trouvée")
    }

    // Vérifier si l'utilisateur est l'artiste ou un admin
    if (artwork.artistId !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Vous n'êtes pas autorisé à modifier cette œuvre")
    }

    // Préparer les données à mettre à jour
    const updateData = {
      title,
      description,
      type,
      price: price ? Number.parseFloat(price) : undefined,
      isCustomizable: isCustomizable !== undefined ? isCustomizable === "true" : undefined,
      isPrintable: isPrintable !== undefined ? isPrintable === "true" : undefined,
      tags: tags ? JSON.parse(tags) : undefined,
      // Si l'utilisateur n'est pas admin, la modification remet l'œuvre en attente d'approbation
      status: req.user.role !== "ADMIN" ? "PENDING_APPROVAL" : undefined,
    }

    // Gérer l'upload d'image si présent
    if (req.file) {
      const imageUrl = await uploadImage(req.file)
      updateData.imageUrl = imageUrl
    }

    // Mettre à jour l'œuvre
    const updatedArtwork = await prisma.artwork.update({
      where: { id },
      data: updateData,
    })

    // Mettre à jour les catégories si présentes
    if (categories) {
      // Supprimer les anciennes relations
      await prisma.artwork.update({
        where: { id },
        data: {
          categories: {
            disconnect: artwork.categories.map((cat) => ({ id: cat.id })),
          },
        },
      })

      // Ajouter les nouvelles relations
      await prisma.artwork.update({
        where: { id },
        data: {
          categories: {
            connect: JSON.parse(categories).map((id) => ({ id })),
          },
        },
      })
    }

    // Mettre à jour les options de personnalisation si présentes
    if (customizationOptions) {
      // Supprimer les anciennes options
      await prisma.customizationOption.deleteMany({
        where: { artworkId: id },
      })

      // Ajouter les nouvelles options
      const options = JSON.parse(customizationOptions)

      for (const option of options) {
        await prisma.customizationOption.create({
          data: {
            name: option.name,
            type: option.type,
            options: option.options,
            artwork: {
              connect: { id },
            },
          },
        })
      }
    }

    // Récupérer l'œuvre mise à jour avec toutes ses relations
    const finalArtwork = await prisma.artwork.findUnique({
      where: { id },
      include: {
        categories: true,
        customizationOptions: true,
      },
    })

    return sendResponse(res, {
      data: finalArtwork,
      message: "Œuvre d'art mise à jour avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Supprimer une œuvre d'art
export const deleteArtwork = async (req, res, next) => {
  try {
    const { id } = req.params

    // Vérifier si l'œuvre existe
    const artwork = await prisma.artwork.findUnique({
      where: { id },
    })

    if (!artwork) {
      throw new ApiError(404, "Œuvre d'art non trouvée")
    }

    // Vérifier si l'utilisateur est l'artiste ou un admin
    if (artwork.artistId !== req.user.id && req.user.role !== "ADMIN") {
      throw new ApiError(403, "Vous n'êtes pas autorisé à supprimer cette œuvre")
    }

    // Supprimer l'œuvre
    await prisma.artwork.delete({
      where: { id },
    })

    return sendResponse(res, {
      message: "Œuvre d'art supprimée avec succès",
    })
  } catch (error) {
    next(error)
  }
}

// Approuver ou rejeter une œuvre d'art (admin uniquement)
export const updateArtworkStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    // Vérifier si le statut est valide
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new ApiError(400, "Statut invalide")
    }

    // Vérifier si l'œuvre existe
    const artwork = await prisma.artwork.findUnique({
      where: { id },
    })

    if (!artwork) {
      throw new ApiError(404, "Œuvre d'art non trouvée")
    }

    // Vérifier si l'utilisateur est un admin
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "Seuls les administrateurs peuvent approuver ou rejeter des œuvres")
    }

    // Mettre à jour le statut
    const updatedArtwork = await prisma.artwork.update({
      where: { id },
      data: { status },
    })

    return sendResponse(res, {
      data: updatedArtwork,
      message: `Œuvre d'art ${status === "APPROVED" ? "approuvée" : "rejetée"} avec succès`,
    })
  } catch (error) {
    next(error)
  }
}
