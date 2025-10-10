import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getVoices, createSession } from '../api'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const [inputText, setInputText] = useState('')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('zh-HK-HiuMaanNeural')
  const [isPersistent, setIsPersistent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadVoices()
  }, [])

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

  const handleSegment = async () => {
    if (!inputText.trim()) {
      setError('请输入中文文本')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 创建会话，传递持久化参数
      const session = await createSession(inputText, selectedVoice, isPersistent)

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

  return (
    <div className="py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-3 sm:mb-4 animate-gradient">
            粤语 TTS 分词播放器
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
            智能分词 · 语音播放 · 粤语学习助手
          </p>
          <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-4 px-4">
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
              <span className="text-blue-400 text-xs sm:text-sm font-medium">AI 驱动</span>
            </div>
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
              <span className="text-purple-400 text-xs sm:text-sm font-medium">精准分词</span>
            </div>
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-pink-500/10 border border-pink-500/30 rounded-full">
              <span className="text-pink-400 text-xs sm:text-sm font-medium">真人语音</span>
            </div>
          </div>
        </div>

        {/* Input Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">输入文本</h2>
          </div>

          <div className="space-y-4">
            {/* Voice Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">选择粤语语音</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={voices.length === 0}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all duration-200 appearance-none cursor-pointer"
              >
                {voices.length === 0 ? (
                  <option value="">加载语音中...</option>
                ) : (
                  voices.map((voice) => (
                    <option key={voice.ShortName} value={voice.ShortName} className="bg-gray-800">
                      {voice.Name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Persistent Session Switch */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/20 rounded-xl">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  持久化会话
                </label>
                <p className="text-xs text-gray-400">
                  开启后会话将永久保存到 Redis，不会过期
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPersistent(!isPersistent)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  isPersistent ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    isPersistent ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">中文文本</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入中文文本，支持一句一行格式：&#10;你好，今天天气很好。&#10;我们去公园玩吧。&#10;希望每天都有好心情。"
                rows={10}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all duration-200 resize-none"
              />
            </div>

            {/* Segment Button */}
            <button
              onClick={handleSegment}
              disabled={loading || !inputText.trim()}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform ${
                loading || !inputText.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  处理中...
                </div>
              ) : (
                '开始分词'
              )}
            </button>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-blue-400 text-xs flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                支持一句一行格式，系统会自动清理特殊符号和空格
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Card */}
        <div className="mt-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-xl hover:shadow-green-500/10 transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">使用说明</h3>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-xs font-bold">1</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">输入中文文本（支持一句一行）</p>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-xs font-bold">2</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">点击"开始分词"处理文本</p>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-xs font-bold">3</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">在结果页面点击单词或句子播放粤语语音</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
