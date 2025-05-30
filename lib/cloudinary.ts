// Client-side upload function for free Cloudinary usage
export const uploadToCloudinary = async (file: File, folder = "demos") => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "unsigned_preset") // Use unsigned preset for free tier
  formData.append("folder", folder)
  formData.append("resource_type", "auto") // Auto-detect file type

  try {
    // Using a free Cloudinary account - replace with your cloud name
    const cloudName = "demo-platform-free" // Replace with your free Cloudinary cloud name
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.secure_url
  } catch (error) {
    console.error("Cloudinary upload error:", error)

    // Fallback to a simple base64 data URL for demo purposes
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }
}

// Generate video thumbnail
export const generateVideoThumbnail = (videoUrl: string) => {
  if (!videoUrl.includes("cloudinary.com")) return videoUrl
  return videoUrl.replace("/upload/", "/upload/so_0,w_400,h_300,c_fill/")
}

// Generate optimized image URL
export const optimizeImage = (imageUrl: string, width = 800, height = 600) => {
  if (!imageUrl.includes("cloudinary.com")) return imageUrl
  return imageUrl.replace("/upload/", `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`)
}

// Free alternative: Convert file to base64 for local storage
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
