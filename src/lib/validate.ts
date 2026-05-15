export function validateDisplayName(name: unknown) {
  if (typeof name !== "string") return "Display name is required."
  if (name.length < 3) return "Display name must be at least 3 characters."
  if (name.length > 30) return "Display name must be at most 30 characters."
  return null
}

export function validatePassword(password: unknown) {
  if (typeof password !== "string") return "Password is required."
  if (password.length < 6) return "Password must be at least 6 characters."
  if (password.length > 128) return "Password must be at most 128 characters."
  return null
}

export function validateTextField(value: unknown, fieldName: string, maxLength: number) {
  if (typeof value !== "string" || value.trim().length === 0) return `${fieldName} is required.`
  if (value.length > maxLength) return `${fieldName} must be at most ${maxLength} characters.`
  return null
}
