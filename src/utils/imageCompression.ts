export async function compressImageToBase64(file: File, maxSize = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagen no válido'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'))
          return
        }

        // Center-crop square or scale proportionally within maxSize x maxSize
        const size = Math.min(img.width, img.height)
        const sx = Math.floor((img.width - size) / 2)
        const sy = Math.floor((img.height - size) / 2)

        const targetSize = Math.min(maxSize, size)
        canvas.width = targetSize
        canvas.height = targetSize

        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize)

        const webp = canvas.toDataURL('image/webp', 0.78)
        if (webp.startsWith('data:image/webp')) {
          resolve(webp)
          return
        }
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
