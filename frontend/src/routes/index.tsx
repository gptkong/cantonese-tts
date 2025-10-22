import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getVoices, createSession, getPersistentSessions } from '../api'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const [inputText, setInputText] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('zh-HK-HiuMaanNeural')
  const [isPersistent, setIsPersistent] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [persistentSessions, setPersistentSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [bingWallpaper, setBingWallpaper] = useState('')

  useEffect(() => {
    loadVoices()
    loadPersistentSessions()
    loadBingWallpaper()
  }, [])

  const loadBingWallpaper = async () => {
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

  const loadVoices = async () => {
    try {
      const voiceList = await getVoices()
      const cantoneseVoices = voiceList.filter(v => v.Locale && v.Locale.startsWith('zh-HK'))
      setVoices(cantoneseVoices)
      if (cantoneseVoices.length > 0) {
        setSelectedVoice(cantoneseVoices[0].ShortName)
      }
    } catch (err) {
      console.error('加载语音列表失败:', err)
      setError('无法加载语音列表，请确保TTS服务正在运行')
    }
  }

  const loadPersistentSessions = async () => {
    setLoadingSessions(true)
    try {
      const result = await getPersistentSessions()
      setPersistentSessions(result.sessions || [])
    } catch (err) {
      console.error('加载持久化会话列表失败:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleSegment = async () => {
    if (!inputText.trim()) {
      setError('请输入中文文本')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 创建会话，传递持久化参数和名称
      const session = await createSession(
        inputText,
        selectedVoice,
        isPersistent,
        isPersistent && sessionName.trim() ? sessionName.trim() : null
      )

      // 导航到结果页面，只传递会话ID
      navigate({
        to: '/results/$sessionId',
        params: {
          sessionId: session.session_id,
        },
      })
    } catch (err) {
      console.error('创建会话失败:', err)
      setError('创建会话失败，请确保TTS服务正在运行')
      setLoading(false)
    }
  }

  const handleSessionClick = (sessionId: string) => {
    navigate({
      to: '/results/$sessionId',
      params: {
        sessionId: sessionId,
      },
    })
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: bingWallpaper ? `url(${bingWallpaper})` : 'linear-gradient(to bottom right, #1a1a2e, #16213e)'
      }}
    >
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* 顶部导航栏 */}
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              粤语 TTS 分词播放器
            </h1>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* 主输入卡片 */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl mb-6">
            <div className="space-y-6">
              {/* 语音选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">选择语音</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  disabled={voices.length === 0}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
                >
                  {voices.length === 0 ? (
                    <option value="">加载中...</option>
                  ) : (
                    voices.map((voice) => (
                      <option key={voice.ShortName} value={voice.ShortName} className="bg-gray-800">
                        {voice.DisplayName} ({voice.Gender === 'Female' ? '女声' : '男声'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 持久化开关 (仅开发环境) */}
              {import.meta.env.DEV && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/10 border border-white/30 rounded-xl">
                    <div>
                      <label className="text-sm font-medium text-gray-200">持久化会话</label>
                      <p className="text-xs text-gray-300 mt-1">永久保存到 Redis</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPersistent(!isPersistent)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isPersistent ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isPersistent ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {isPersistent && (
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="会话名称（可选）"
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
                    />
                  )}
                </div>
              )}

              {/* 文本输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">输入文本</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="如果你在这里输入你最爱的歌词呢？"
                  rows={8}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm resize-none"
                />
              </div>

              {/* 开始按钮 */}
              <button
                onClick={handleSegment}
                disabled={loading || !inputText.trim()}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  loading || !inputText.trim()
                    ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    处理中...
                  </div>
                ) : (
                  '开始分词'
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-500/20 border border-red-400/40 rounded-xl">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* 猜你喜欢卡片 */}
          {persistentSessions.length > 0 && (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">猜你喜欢</h3>
                <button
                  onClick={loadPersistentSessions}
                  disabled={loadingSessions}
                  className="text-sm text-purple-300 hover:text-purple-200"
                >
                  {loadingSessions ? '加载中...' : '刷新'}
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {persistentSessions.map((session, index) => (
                  <button
                    key={session.session_id}
                    onClick={() => handleSessionClick(session.session_id)}
                    className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {session.name ? (
                          <>
                            <div className="text-white font-medium truncate">{session.name}</div>
                            <div className="text-gray-300 text-xs font-mono truncate">{session.session_id}</div>
                          </>
                        ) : (
                          <div className="text-gray-200 text-sm font-mono truncate">{session.session_id}</div>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-gray-300 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 使用说明卡片 */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">使用说明</h3>
            <div className="space-y-3">
              <div className="flex gap-3 text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/30 border border-blue-400/50 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <p>输入中文文本（支持一句一行）</p>
              </div>
              <div className="flex gap-3 text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/30 border border-blue-400/50 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <p>点击"开始分词"处理文本</p>
              </div>
              <div className="flex gap-3 text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/30 border border-blue-400/50 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <p>在结果页面点击单词或句子播放粤语语音</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
