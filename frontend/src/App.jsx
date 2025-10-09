import { useState, useEffect } from 'react'
import './App.css'
import { segmentText, generateSpeech, getVoices } from './api'

function App() {
  const [inputText, setInputText] = useState('')
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('zh-HK-HiuMaanNeural')
  const [error, setError] = useState('')

  // 加载可用语音列表
  useEffect(() => {
    loadVoices()
  }, [])

  const loadVoices = async () => {
    try {
      const voiceList = await getVoices()
      // 筛选出粤语语音
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

  // 处理分词
  const handleSegment = async () => {
    if (!inputText.trim()) {
      setError('请输入中文文本')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await segmentText(inputText, 'default')
      setWords(result.words)
    } catch (err) {
      console.error('分词失败:', err)
      setError('分词失败，请确保TTS服务正在运行')
    } finally {
      setLoading(false)
    }
  }

  // 处理单词TTS播放
  const handlePlayWord = async (word, index) => {
    if (playingIndex !== null) {
      return // 防止同时播放多个音频
    }

    setPlayingIndex(index)
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

  return (
    <div className="app">
      <div className="container">
        <h1>粤语TTS分词播放器</h1>

        <div className="voice-selector">
          <label htmlFor="voice-select">选择粤语语音：</label>
          <select
            id="voice-select"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={voices.length === 0}
          >
            {voices.map(voice => (
              <option key={voice.ShortName} value={voice.ShortName}>
                {voice.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="input-section">
          <textarea
            className="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入中文文本..."
            rows={5}
          />
          <button
            className="segment-button"
            onClick={handleSegment}
            disabled={loading || !inputText.trim()}
          >
            {loading ? '分词中...' : '分词'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {words.length > 0 && (
          <div className="words-section">
            <h2>分词结果（点击单词播放语音）：</h2>
            <div className="words-container">
              {words.map((word, index) => (
                <span
                  key={index}
                  className={`word ${playingIndex === index ? 'playing' : ''}`}
                  onClick={() => handlePlayWord(word, index)}
                  title="点击播放语音"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="instructions">
          <h3>使用说明：</h3>
          <ul>
            <li>在文本框中输入中文文本</li>
            <li>点击"分词"按钮进行中文分词</li>
            <li>点击分词结果中的任意单词，即可听到粤语语音</li>
            <li>可以选择不同的粤语语音进行播放</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
