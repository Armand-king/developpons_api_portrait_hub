import { validationResult } from "express-validator"
import { ApiError } from "../utils/api-error.js"

export const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return next(new ApiError(400, "Erreur de validation", errors.array()))
  }

  next()
}
