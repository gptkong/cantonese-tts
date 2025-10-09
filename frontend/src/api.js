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
 * 智能分句API
 * @param {string} text - 需要分句的文本
 * @returns {Promise<Array<{sentence: string, words: string[]}>>} - 句子数组，每个句子包含原文和分词结果
 */
export async function segmentBySentences(text) {
  // 使用简单的分句规则：按句号、问号、感叹号、换行符分割
  const sentences = text.split(/([。！？\n]+)/).filter(s => s.trim());

  // 合并标点符号到前一句
  const mergedSentences = [];
  for (let i = 0; i < sentences.length; i++) {
    const current = sentences[i].trim();
    if (!current) continue;

    if (/^[。！？\n]+$/.test(current)) {
      // 如果是纯标点，附加到上一句
      if (mergedSentences.length > 0) {
        mergedSentences[mergedSentences.length - 1] += current;
      }
    } else {
      mergedSentences.push(current);
    }
  }

  // 对每个句子进行分词
  const results = await Promise.all(
    mergedSentences.map(async (sentence) => {
      try {
        const result = await segmentText(sentence, 'default');
        return {
          sentence: sentence,
          words: result.words || []
        };
      } catch (error) {
        console.error('分词失败:', error);
        return {
          sentence: sentence,
          words: [sentence] // 如果分词失败，整句作为一个词
        };
      }
    })
  );

  return results;
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
