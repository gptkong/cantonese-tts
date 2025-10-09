// API服务配置
// 使用空字符串以便通过Vite代理访问
const API_BASE_URL = '';

/**
 * 中文分词API
 * @param {string} text - 需要分词的中文文本
 * @param {string} mode - 分词模式: 'default', 'search', 'full'
 * @returns {Promise<{text: string, mode: string, words: string[], count: number}>}
 */
export async function segmentText(text, mode = 'default') {
  const response = await fetch(`${API_BASE_URL}/api/v1/segment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, mode }),
  });

  if (!response.ok) {
    throw new Error(`分词失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 文字转语音API
 * @param {string} text - 需要转换的文本
 * @param {string} voice - 语音名称，例如 'zh-HK-HiuMaanNeural' (粤语)
 * @param {string} rate - 语速调整
 * @param {string} volume - 音量调整
 * @param {string} pitch - 音调调整
 * @returns {Promise<Blob>} - 音频数据
 */
export async function generateSpeech(text, voice = 'zh-HK-HiuMaanNeural', rate = '+0%', volume = '+0%', pitch = '+0Hz') {
  const response = await fetch(`${API_BASE_URL}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice, rate, volume, pitch }),
  });

  if (!response.ok) {
    throw new Error(`语音生成失败: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * 获取可用的语音列表
 * @returns {Promise<Array>} - 语音列表
 */
export async function getVoices() {
  const response = await fetch(`${API_BASE_URL}/api/v1/voices`);

  if (!response.ok) {
    throw new Error(`获取语音列表失败: ${response.statusText}`);
  }

  return response.json();
}
