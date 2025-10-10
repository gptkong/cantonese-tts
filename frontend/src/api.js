// API服务配置
// 使用空字符串以便通过Vite代理访问
const API_BASE_URL = '';

/**
 * 创建新会话
 * @param {string} text - 用户输入的文本
 * @param {string} voice - 选择的语音
 * @returns {Promise<{session_id: string, text: string, voice: string, ...}>}
 */
export async function createSession(text, voice) {
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    throw new Error(`创建会话失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取会话数据
 * @param {string} sessionId - 会话ID
 * @returns {Promise<{session_id: string, text: string, voice: string, sentences: Array, ...}>}
 */
export async function getSession(sessionId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error(`获取会话失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 对会话文本进行分词
 * @param {string} sessionId - 会话ID
 * @returns {Promise<{session_id: string, sentences: Array, sentence_count: number}>}
 */
export async function segmentSession(sessionId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${sessionId}/segment`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`分词失败: ${response.statusText}`);
  }

  return response.json();
}

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
 * 清理文本，移除不需要的字符（保留换行符）
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
function cleanText(text) {
  return text
    // 保留换行符用于分句，但规范化其他空白字符
    .replace(/[ \t\f\r]+/g, ' ') // 将空格、制表符等替换为单个空格
    // 移除多余的空格（保留单个空格）
    .replace(/ +/g, ' ')
    // 移除常见的特殊符号（保留中文标点和换行符）
    .replace(/[，、；：""''（）【】《》〔〕「」『』]/g, '')
    // 移除英文标点（保留换行符）
    .replace(/[,;:"'\(\)\[\]{}<>\\\/]/g, '')
    // 移除特殊符号和表情符号
    .replace(/[©®™™°±×÷§¶†‡•…‰′″‴]/g, '')
    // 移除数字中的分隔符
    .replace(/[\d,，.。]+/g, match => match.replace(/[^\d]/g, ''))
    // 移除开头和结尾的空格，但保留中间的换行符
    .trim();
}

/**
 * 清理分词结果，移除空词和特殊符号
 * @param {string[]} words - 原始分词结果
 * @returns {string[]} - 清理后的分词结果
 */
function cleanWords(words) {
  return words
    .filter(word => word && word.trim()) // 移除空词
    .map(word => word.trim()) // 移除每个词两端的空格
    .map(word => {
      // 移除词中的特殊符号，但保留中文内容
      return word
        .replace(/[^\u4e00-\u9fff]/g, '') // 移除非中文字符
        .replace(/^\s+|\s+$/g, '') // 移除两端空格
        .replace(/\s+/g, ''); // 移除中间多余空格
    })
    .filter(word => {
      // 保留长度大于0的词
      return word.length > 0;
    })
    .filter(word => {
      // 确保词是有意义的中文词
      return /^[\u4e00-\u9fff]+$/.test(word) && word.length >= 1;
    });
}

/**
 * 智能分句API
 * @param {string} text - 需要分句的文本
 * @returns {Promise<Array<{sentence: string, words: string[]}>>} - 句子数组，每个句子包含原文和分词结果
 */
export async function segmentBySentences(text) {
  // 首先清理输入文本，但保留换行符用于分句
  const cleanedText = cleanText(text);

  // 如果清理后没有内容，返回空数组
  if (!cleanedText || cleanedText.trim().length === 0) {
    return [];
  }

  // 使用更严格的分句规则：按换行符、句号、问号、感叹号分割
  // 优先按换行符分句，保持一句一行的格式
  let sentences = [];

  // 先按换行符分割，保持原有的行结构
  const lines = cleanedText.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 检查这一行是否包含多个句子（通过句号、问号、感叹号判断）
    const subSentences = trimmedLine.split(/([。！？]+)/).filter(s => s.trim());

    if (subSentences.length > 1) {
      // 如果有多个子句，合并标点符号
      let currentSentence = '';
      for (let i = 0; i < subSentences.length; i++) {
        const current = subSentences[i].trim();
        if (!current) continue;

        if (/^[。！？]+$/.test(current)) {
          // 如果是标点符号，附加到当前句子
          currentSentence += current;
          if (currentSentence) {
            sentences.push(currentSentence);
            currentSentence = '';
          }
        } else {
          // 如果是文本内容
          if (currentSentence) {
            currentSentence += current;
          } else {
            currentSentence = current;
          }
        }
      }

      // 处理最后一个没有标点结尾的句子
      if (currentSentence) {
        sentences.push(currentSentence);
      }
    } else {
      // 如果整行就是一个句子，直接添加
      sentences.push(trimmedLine);
    }
  }

  // 对每个句子进行分词
  const results = await Promise.all(
    sentences.map(async (sentence) => {
      try {
        const result = await segmentText(sentence, 'default');
        let words = result.words || [];

        // 清理分词结果
        words = cleanWords(words);

        // 如果清理后没有有效的词，则尝试从原句中提取中文词
        if (words.length === 0) {
          const chineseText = sentence.replace(/[^\u4e00-\u9fff。！？]/g, '');
          if (chineseText.length > 0) {
            // 使用正则表达式提取中文词
            const extractedWords = chineseText.match(/[\u4e00-\u9fff]+/g) || [];
            words = extractedWords.filter(word => word.length >= 1);
          }
        }

        // 如果还是没有词，将整个清理后的句子作为一个词
        if (words.length === 0) {
          const cleanSentence = sentence.replace(/[^\u4e00-\u9fff]/g, '');
          if (cleanSentence.length > 0) {
            words = [cleanSentence];
          }
        }

        return {
          sentence: sentence,
          words: words
        };
      } catch (error) {
        console.error('分词失败:', error);
        // 如果分词失败，尝试提取中文词
        const chineseWords = sentence.match(/[\u4e00-\u9fff]+/g) || [];
        const validWords = chineseWords.filter(word => word.length >= 1);

        return {
          sentence: sentence,
          words: validWords.length > 0 ? validWords : [sentence.replace(/[^\u4e00-\u9fff]/g, '')].filter(w => w.length > 0)
        };
      }
    })
  );

  // 过滤掉没有任何有效词的句子
  return results.filter(result => result.words.length > 0 && result.words.some(word => word.length > 0));
}

/**
 * 清理用于语音生成的文本
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
function cleanTextForTTS(text) {
  return text
    // 移除多余的空格
    .replace(/\s+/g, ' ')
    // 移除不适合朗读的特殊符号
    .replace(/[，、；：""''（）【】《》〔〕「」『』©®™™°±×÷§¶†‡•…‰′″‴\\\/]/g, '')
    // 移除英文标点
    .replace(/[,;:"'\(\)\[\]{}<>]/g, '')
    // 保留基本标点符号用于语调停顿
    .replace(/[。！？]/g, match => match + ' ') // 在句末标点后加空格
    .trim();
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
  // 清理用于语音生成的文本
  const cleanedText = cleanTextForTTS(text);

  // 如果清理后没有内容，抛出错误
  if (!cleanedText || cleanedText.trim().length === 0) {
    throw new Error('没有有效的文本内容用于语音生成');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: cleanedText, voice, rate, volume, pitch }),
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
