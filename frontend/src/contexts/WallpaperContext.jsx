import { createContext, useContext, useState, useEffect } from 'react'

const WallpaperContext = createContext()

export function useWallpaper() {
  const context = useContext(WallpaperContext)
  if (!context) {
    throw new Error('useWallpaper must be used within a WallpaperProvider')
  }
  return context
}

export function WallpaperProvider({ children }) {
  const [bingWallpaper, setBingWallpaper] = useState('')

  const loadBingWallpaper = async () => {
    // 如果已经有壁纸，不再重复请求
    if (bingWallpaper) {
      return
    }

    try {
      // 使用 Nginx 代理访问 Bing 每日壁纸 API
      const response = await fetch('/bing-wallpaper/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN')
      const data = await response.json()
      if (data.images && data.images.length > 0) {
        // 使用代理路径访问图片
        const imageUrl = `/bing-wallpaper${data.images[0].url}`
        setBingWallpaper(imageUrl)
      }
    } catch (err) {
      console.error('加载 Bing 壁纸失败:', err)
    }
  }

  useEffect(() => {
    loadBingWallpaper()
  }, [])

  const value = {
    bingWallpaper,
    loadBingWallpaper
  }

  return (
    <WallpaperContext.Provider value={value}>
      {children}
    </WallpaperContext.Provider>
  )
}