import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import { promisify } from "util"

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const unlinkAsync = promisify(fs.unlink)

// Fonction pour uploader une image sur Cloudinary
export const uploadImage = async (file) => {
  try {
    // Uploader le fichier sur Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "art-and-deco",
      resource_type: "image",
    })

    // Supprimer le fichier temporaire
    await unlinkAsync(file.path)

    // Retourner l'URL de l'image
    return result.secure_url
  } catch (error) {
    console.error("Erreur lors de l'upload de l'image:", error)
    throw new Error("Erreur lors de l'upload de l'image")
  }
}

// Fonction pour supprimer une image de Cloudinary
export const deleteImage = async (imageUrl) => {
  try {
    // Extraire l'ID public de l'URL
    const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0]

    // Supprimer l'image
    await cloudinary.uploader.destroy(`art-and-deco/${publicId}`)

    return true
  } catch (error) {
    console.error("Erreur lors de la suppression de l'image:", error)
    return false
  }
}
