import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getSession, segmentSession, generateSpeech } from '../api'

export const Route = createFileRoute('/results_/$sessionId')({
  component: ResultsPage,
})

function ResultsPage() {
  const navigate = useNavigate()
  const { sessionId } = Route.useParams()
  const [session, setSession] = useState(null)
  const [sentences, setSentences] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSessionAndSegment()
  }, [sessionId])

  const loadSessionAndSegment = async () => {
    setLoading(true)
    setError('')

    try {
      // 获取会话数据
      const sessionData = await getSession(sessionId)
      setSession(sessionData)

      // 如果会话已有分词结果，直接使用
      if (sessionData.sentences && sessionData.sentences.length > 0) {
        setSentences(sessionData.sentences)
        setLoading(false)
        return
      }

      // 否则执行分词
      const segmentResult = await segmentSession(sessionId)
      setSentences(segmentResult.sentences)

    } catch (err) {
      console.error('加载会话或分词失败:', err)
      setError('加载失败，会话可能已过期')
      // 3秒后返回首页
      setTimeout(() => {
        navigate({ to: '/' })
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayWord = async (word, sentenceIdx, wordIdx) => {
    if (playingIndex !== null || playingSentenceIndex !== null || !session) {
      return
    }

    setPlayingIndex({ sentenceIdx, wordIdx })
    setError('')

    try {
      const audioBlob = await generateSpeech(word, session.voice)
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
    if (playingIndex !== null || playingSentenceIndex !== null || !session) {
      return
    }

    setPlayingSentenceIndex(sentenceIdx)
    setError('')

    try {
      const audioBlob = await generateSpeech(sentence, session.voice)
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
          {session && (
            <div className="ml-auto text-sm text-gray-400">
              会话: {sessionId.substring(0, 8)}...
            </div>
          )}
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
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {sentences.map((sentenceObj, sentenceIdx) => (
                <div
                  key={sentenceIdx}
                  className={`group relative backdrop-blur-sm rounded-2xl p-5 transition-all duration-500 border ${
                    playingSentenceIndex === sentenceIdx
                      ? 'bg-gradient-to-br from-blue-500/25 via-purple-500/20 to-pink-500/15 border-blue-400/60 shadow-2xl shadow-blue-500/30 scale-[1.03]'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {/* 角落装饰边框 */}
                  {playingSentenceIndex === sentenceIdx && (
                    <>
                      <span className="absolute w-4 h-4 border-[3px] rounded-[4px] -top-2 -left-2 border-r-0 border-b-0 border-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)] transition-all duration-300"></span>
                      <span className="absolute w-4 h-4 border-[3px] rounded-[4px] -top-2 -right-2 border-l-0 border-b-0 border-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)] transition-all duration-300"></span>
                      <span className="absolute w-4 h-4 border-[3px] rounded-[4px] -bottom-2 -left-2 border-r-0 border-t-0 border-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)] transition-all duration-300"></span>
                      <span className="absolute w-4 h-4 border-[3px] rounded-[4px] -bottom-2 -right-2 border-l-0 border-t-0 border-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)] transition-all duration-300"></span>
                    </>
                  )}

                  <div className="flex gap-4 items-center">
                    {/* Play Button - 增强版 */}
                    <button
                      onClick={() => handlePlaySentence(sentenceObj.sentence, sentenceIdx)}
                      disabled={playingIndex !== null || playingSentenceIndex !== null}
                      className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                        playingSentenceIndex === sentenceIdx
                          ? 'bg-gradient-to-br from-green-400 via-teal-500 to-cyan-500 text-white shadow-2xl shadow-teal-500/50 scale-105'
                          : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white'
                      } ${(playingIndex !== null || playingSentenceIndex !== null) ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >

                      {playingSentenceIndex === sentenceIdx ? (
                        <div className="relative">
                          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <div className="absolute inset-0 w-5 h-5 border-3 border-white/10 rounded-full animate-ping"></div>
                        </div>
                      ) : (
                        <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Words Container - 增强交互 */}
                    <div className="flex flex-wrap gap-2.5 flex-1">
                      {sentenceObj.words.map((word, wordIdx) => (
                        <button
                          key={wordIdx}
                          onClick={() => handlePlayWord(word, sentenceIdx, wordIdx)}
                          disabled={playingIndex !== null || playingSentenceIndex !== null}
                          className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform overflow-hidden ${
                            playingIndex?.sentenceIdx === sentenceIdx &&
                            playingIndex?.wordIdx === wordIdx
                              ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white scale-110 shadow-2xl shadow-purple-500/50 z-10'
                              : playingSentenceIndex === sentenceIdx
                              ? 'bg-blue-500/25 text-blue-200 border border-blue-400/40'
                              : 'bg-white/10 text-gray-200 border border-white/20'
                          } ${(playingIndex !== null || playingSentenceIndex !== null) && !(playingIndex?.sentenceIdx === sentenceIdx && playingIndex?.wordIdx === wordIdx) ? 'opacity-40 cursor-not-allowed' : ''}`}
                          style={{
                            filter: playingSentenceIndex === sentenceIdx && playingIndex?.sentenceIdx !== sentenceIdx
                              ? 'blur(0px)'
                              : playingSentenceIndex !== null && playingSentenceIndex !== sentenceIdx
                              ? 'blur(2px)'
                              : 'blur(0px)',
                          }}
                        >
                          {/* 按钮背景光效 */}
                          {playingIndex?.sentenceIdx === sentenceIdx && playingIndex?.wordIdx === wordIdx && (
                            <span className="absolute inset-0 bg-gradient-to-r from-blue-400/50 via-purple-400/50 to-pink-400/50 animate-pulse"></span>
                          )}

                          <span className="relative z-10">{word}</span>
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
