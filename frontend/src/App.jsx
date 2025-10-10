import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Divider,
  Spinner
} from '@heroui/react'
import { segmentBySentences, generateSpeech, getVoices } from './api'

function App() {
  const [inputText, setInputText] = useState('')
  const [sentences, setSentences] = useState([])
  const [loading, setLoading] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState(null)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('zh-HK-HiuMaanNeural')
  const [error, setError] = useState('')

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
      const result = await segmentBySentences(inputText)
      setSentences(result)
    } catch (err) {
      console.error('分词失败:', err)
      setError('分词失败，请确保TTS服务正在运行')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayWord = async (word, sentenceIdx, wordIdx) => {
    if (playingIndex !== null || playingSentenceIndex !== null) {
      return
    }

    setPlayingIndex({ sentenceIdx, wordIdx })
    setError('')

    try {
      const audioBlob = await generateSpeech(word, selectedVoice)
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        setPlayingIndex(null)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setPlayingIndex(null)
        setError('音频播放失败')
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('TTS生成失败:', err)
      setError('语音生成失败，请确保TTS服务正在运行')
      setPlayingIndex(null)
    }
  }

  const handlePlaySentence = async (sentence, sentenceIdx) => {
    if (playingIndex !== null || playingSentenceIndex !== null) {
      return
    }

    setPlayingSentenceIndex(sentenceIdx)
    setError('')

    try {
      const audioBlob = await generateSpeech(sentence, selectedVoice)
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        setPlayingSentenceIndex(null)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setPlayingSentenceIndex(null)
        setError('音频播放失败')
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('TTS生成失败:', err)
      setError('语音生成失败，请确保TTS服务正在运行')
      setPlayingSentenceIndex(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
              {/* Left Panel - Input & Controls */}
              <div className="xl:col-span-1 space-y-4">
                {/* Input Card */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">输入文本</h2>
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
                              {voice.DisplayName} ({voice.Gender === 'Female' ? '女声' : '男声'})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Text Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">中文文本</label>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="请输入中文文本，支持一句一行格式：&#10;你好，今天天气很好。&#10;我们去公园玩吧。&#10;希望每天都有好心情。"
                        rows={8}
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
                          分词中...
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
                      <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact Instructions Card */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-xl hover:shadow-green-500/10 transition-all duration-300">
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
                      <p className="text-gray-300 text-xs leading-relaxed">点击播放按钮听取语音</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Results */}
              <div className="xl:col-span-2">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl h-[600px] lg:h-[700px] hover:shadow-orange-500/10 transition-all duration-300 flex flex-col">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">分词结果</h2>
                    {sentences.length > 0 && (
                      <div className="ml-auto px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                        <span className="text-green-400 text-xs sm:text-sm font-medium">{sentences.length} 个句子</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-0">
                    {sentences.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-300 mb-2">暂无分词结果</p>
                        <p className="text-sm text-gray-400 text-center px-4">请在左侧输入文本并点击"开始分词"</p>
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-3 sm:space-y-4">
                          {sentences.map((sentenceObj, sentenceIdx) => (
                            <div
                              key={sentenceIdx}
                              className={`backdrop-blur-sm rounded-xl p-3 sm:p-4 transition-all duration-300 border ${
                                playingSentenceIndex === sentenceIdx
                                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20 scale-[1.02]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]'
                              }`}
                            >
                              <div className="flex gap-3 items-start">
                                {/* Play Button */}
                                <button
                                  onClick={() => handlePlaySentence(sentenceObj.sentence, sentenceIdx)}
                                  disabled={playingIndex !== null || playingSentenceIndex !== null}
                                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                                    playingSentenceIndex === sentenceIdx
                                      ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-110 hover:shadow-lg'
                                  } ${(playingIndex !== null || playingSentenceIndex !== null) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {playingSentenceIndex === sentenceIdx ? (
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  ) : (
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  )}
                                </button>

                                {/* Words Container */}
                                <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1">
                                  {sentenceObj.words.map((word, wordIdx) => (
                                    <button
                                      key={wordIdx}
                                      onClick={() => handlePlayWord(word, sentenceIdx, wordIdx)}
                                      disabled={playingIndex !== null || playingSentenceIndex !== null}
                                      className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 transform ${
                                        playingIndex?.sentenceIdx === sentenceIdx &&
                                        playingIndex?.wordIdx === wordIdx
                                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110 shadow-lg'
                                          : playingSentenceIndex === sentenceIdx
                                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30'
                                          : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20 hover:scale-105 hover:border-white/30'
                                      } ${(playingIndex !== null || playingSentenceIndex !== null) && !(playingIndex?.sentenceIdx === sentenceIdx && playingIndex?.wordIdx === wordIdx) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {word}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
