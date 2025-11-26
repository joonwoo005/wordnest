// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Check if a string contains Chinese characters
export const hasChinese = (str: string): boolean => {
  const chineseRegex = /[\u4E00-\u9FFF]/g;
  return chineseRegex.test(str);
};

// Check if a string contains English characters
export const hasEnglish = (str: string): boolean => {
  const englishRegex = /[a-zA-Z]/g;
  return englishRegex.test(str);
};

// Check if a string contains Pinyin (letters + tone marks)
export const hasPinyin = (str: string): boolean => {
  const pinyinRegex = /[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g;
  return pinyinRegex.test(str);
};

// Filter words by search query (supports Chinese, English, and Pinyin)
export const searchWords = (
  words: any[],
  query: string,
  language: 'zh' | 'en'
): any[] => {
  if (!query.trim()) {
    return words;
  }

  const lowerQuery = query.toLowerCase();

  return words.filter(word => {
    const matchesChinese = word.chinese.includes(query);
    const matchesEnglish = word.english.toLowerCase().includes(lowerQuery);
    const matchesPinyin = word.pinyin.toLowerCase().includes(lowerQuery);

    return matchesChinese || matchesEnglish || matchesPinyin;
  });
};

// Format date to readable string
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Get word status color
export const getStatusColor = (status: 'white' | 'green' | 'red'): string => {
  switch (status) {
    case 'white':
      return '#FFFFFF';
    case 'green':
      return '#4CAF50';
    case 'red':
      return '#F44336';
    default:
      return '#FFFFFF';
  }
};

// Get word status label in English
export const getStatusLabel = (status: 'white' | 'green' | 'red', language: 'zh' | 'en'): string => {
  if (language === 'zh') {
    switch (status) {
      case 'white':
        return '新添加';
      case 'green':
        return '已学会';
      case 'red':
        return '需要复习';
      default:
        return '新添加';
    }
  } else {
    switch (status) {
      case 'white':
        return 'New';
      case 'green':
        return 'Learned';
      case 'red':
        return 'Review';
      default:
        return 'New';
    }
  }
};
