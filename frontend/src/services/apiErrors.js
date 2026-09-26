const statusMessages = {
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  500: 'The server could not complete the request. Please try again later.',
}

export function getApiErrorMessage(error, fallback) {
  const status = error?.response?.status
  if (statusMessages[status]) return statusMessages[status]

  const message = error?.response?.data?.message
  if ([400, 401, 409].includes(status) && typeof message === 'string' && message.trim()) {
    return message.trim()
  }

  return fallback
}