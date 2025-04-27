export class ApiResponse {
  constructor(statusCode, data, message = "Succès") {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
}

export const sendResponse = (res, { statusCode = 200, data = null, message = "Succès" }) => {
  const response = new ApiResponse(statusCode, data, message)
  return res.status(statusCode).json(response)
}
