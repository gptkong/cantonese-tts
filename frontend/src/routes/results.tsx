import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { segmentBySentences, generateSpeech } from '../api'

// 定义搜索参数的类型
type ResultsSearch = {
  text: string
  voice: string
}

export const Route = createFileRoute('/results')({
  validateSearch: (search: Record<string, unknown>): ResultsSearch => {
    return {
      text: (search.text as string) || '',
      voice: (search.voice as string) || 'zh-HK-HiuMaanNeural',
    }
  },
  component: ResultsPage,
})

function ResultsPage() {
  const navigate = useNavigate()
  const { text, voice } = Route.useSearch()
  const [sentences, setSentences] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!text) {
      navigate({ to: '/' })
      return
    }

    handleSegment()
  }, [text])

  const handleSegment = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await segmentBySentences(text)
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
      const audioBlob = await generateSpeech(word, voice)
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
      const audioBlob = await generateSpeech(sentence, voice)
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
    <div className="py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/"
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            分词结果
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Results Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl min-h-[600px] hover:shadow-orange-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">分词结果</h2>
            {sentences.length > 0 && (
              <div className="ml-auto px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                <span className="text-green-400 text-sm font-medium">{sentences.length} 个句子</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium text-gray-300">分词处理中...</p>
            </div>
          ) : sentences.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-300 mb-2">暂无分词结果</p>
              <p className="text-sm text-gray-400">请返回首页输入文本</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {sentences.map((sentenceObj, sentenceIdx) => (
                <div
                  key={sentenceIdx}
                  className={`backdrop-blur-sm rounded-xl p-4 transition-all duration-300 border ${
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
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                        playingSentenceIndex === sentenceIdx
                          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-110 hover:shadow-lg'
                      } ${(playingIndex !== null || playingSentenceIndex !== null) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {playingSentenceIndex === sentenceIdx ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Words Container */}
                    <div className="flex flex-wrap gap-2 flex-1">
                      {sentenceObj.words.map((word, wordIdx) => (
                        <button
                          key={wordIdx}
                          onClick={() => handlePlayWord(word, sentenceIdx, wordIdx)}
                          disabled={playingIndex !== null || playingSentenceIndex !== null}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 transform ${
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
          )}
        </div>
      </div>
    </div>
  )
}
