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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="flex flex-col items-center pb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              粤语 TTS 分词播放器
            </h1>
            <p className="text-gray-500 mt-2">智能分词 · 语音播放 · 粤语学习</p>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Panel - Input & Controls */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-700">输入文本</h2>
              </CardHeader>
              <CardBody className="gap-4">
                {/* Voice Selector */}
                <Select
                  label="选择粤语语音"
                  placeholder="请选择语音"
                  selectedKeys={[selectedVoice]}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  isDisabled={voices.length === 0}
                  color="primary"
                  variant="bordered"
                >
                  {voices.map((voice) => (
                    <SelectItem key={voice.ShortName} value={voice.ShortName}>
                      {voice.Name}
                    </SelectItem>
                  ))}
                </Select>

                {/* Text Input */}
                <Textarea
                  label="中文文本"
                  placeholder="请输入中文文本，支持多句..."
                  value={inputText}
                  onValueChange={setInputText}
                  minRows={8}
                  variant="bordered"
                  color="primary"
                />

                {/* Segment Button */}
                <Button
                  color="primary"
                  size="lg"
                  onClick={handleSegment}
                  isDisabled={loading || !inputText.trim()}
                  isLoading={loading}
                  className="w-full font-semibold"
                >
                  {loading ? '分词中...' : '开始分词'}
                </Button>

                {/* Error Message */}
                {error && (
                  <Chip color="danger" variant="flat" className="w-full p-4">
                    {error}
                  </Chip>
                )}
              </CardBody>
            </Card>

            {/* Instructions */}
            <Card className="mt-6 shadow-lg">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-700">使用说明</h3>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 font-bold">1.</span>
                    <span>在文本框中输入中文文本（支持多句）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 font-bold">2.</span>
                    <span>点击"开始分词"按钮进行智能分句和分词</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 font-bold">3.</span>
                    <span>点击每行开头的播放按钮，播放整句语音</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 font-bold">4.</span>
                    <span>点击分词结果中的词语，播放单个词语音</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 font-bold">5.</span>
                    <span>可以选择不同的粤语语音进行播放</span>
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg min-h-[600px]">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-700">分词结果</h2>
              </CardHeader>
              <CardBody>
                {sentences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[500px] text-gray-400">
                    <svg
                      className="w-24 h-24 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                    <p className="text-lg">暂无分词结果</p>
                    <p className="text-sm mt-2">请在左侧输入文本并点击"开始分词"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sentences.map((sentenceObj, sentenceIdx) => (
                      <Card
                        key={sentenceIdx}
                        shadow="sm"
                        className={`transition-all duration-200 ${
                          playingSentenceIndex === sentenceIdx
                            ? 'border-2 border-primary-500 bg-primary-50'
                            : 'hover:shadow-md'
                        }`}
                      >
                        <CardBody className="p-4">
                          <div className="flex gap-3 items-start">
                            {/* Play Button */}
                            <Button
                              isIconOnly
                              color={playingSentenceIndex === sentenceIdx ? 'success' : 'primary'}
                              variant={playingSentenceIndex === sentenceIdx ? 'solid' : 'flat'}
                              size="md"
                              onClick={() => handlePlaySentence(sentenceObj.sentence, sentenceIdx)}
                              isDisabled={playingIndex !== null || playingSentenceIndex !== null}
                              className="shrink-0"
                            >
                              {playingSentenceIndex === sentenceIdx ? (
                                <Spinner size="sm" color="white" />
                              ) : (
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </Button>

                            {/* Words Container */}
                            <div className="flex flex-wrap gap-2 flex-1">
                              {sentenceObj.words.map((word, wordIdx) => (
                                <Chip
                                  key={wordIdx}
                                  onClick={() => handlePlayWord(word, sentenceIdx, wordIdx)}
                                  className={`cursor-pointer transition-all duration-200 text-base px-3 py-1 ${
                                    playingIndex?.sentenceIdx === sentenceIdx &&
                                    playingIndex?.wordIdx === wordIdx
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110 shadow-lg'
                                      : playingSentenceIndex === sentenceIdx
                                      ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                                  }`}
                                  variant="flat"
                                >
                                  {word}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
