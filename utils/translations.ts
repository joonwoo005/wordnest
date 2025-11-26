export type Language = 'en' | 'zh';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Home Screen
    'wordCount': 'words',
    'searchPlaceholder': 'Search Chinese, Pinyin or English...',
    'sortButton': 'Sort',
    'filterStatus': 'Filter',
    'allVocab': 'All Vocab',
    'clearAll': 'Clear All',
    'addNewWord': '+ Add New Word',
    'noWords': 'No words',
    'testButton': 'Test',
    'selectFolder': 'Please select a folder first',
    'noWordsToTest': 'No words to test',

    // Sidebar
    'wordCountFormat': 'words, ',
    'folderCountFormat': 'folders',
    'inputFolderName': 'Enter folder name',

    // Add Word Screen
    'addWord': 'Add Word',
    'chineseLabel': 'Chinese',
    'chinesePlaceholder': 'Enter Chinese',
    'pinyinLabel': 'Pinyin',
    'pinyinPlaceholder': 'Enter Pinyin',
    'englishLabel': 'English',
    'englishPlaceholder': 'Enter English',
    'save': 'Save',
    'fillAllFields': 'Please fill in all fields',
    'wordAdded': 'Word added successfully',
    'back': '← Back',

    // Edit Word Screen
    'editWord': 'Edit Word',
    'delete': 'Delete',
    'practiceCount': 'Practice Count',
    'status': 'Status',
    'deleteConfirm': 'Are you sure you want to delete this word?',
    'wordUpdated': 'Word updated successfully',
    'wordDeleted': 'Word deleted successfully',

    // Common Actions
    'cancel': 'Cancel',

    // Onboarding
    'welcome': 'Welcome!',
    'getStarted': "Let's get you started",
    'namePrompt': "What's your name?",
    'namePlaceholder': 'Enter your name',
    'continue': 'Continue',
    'createFirstFolder': 'Create Your First Folder',
    'createFolderPrompt': "Hi {username}! Let's create your first vocabulary folder",
    'folderNameLabel': 'Folder Name',
    'folderNamePlaceholder': 'e.g., HSK Level 1, Daily Chinese',
    'getStartedButton': 'Get Started',

    // Sort and Filter Options
    'sortNewest': 'Newest',
    'sortOldest': 'Oldest',
    'sortStatus': 'By Status',
    'sortPracticed': 'Most Practiced',
    'filterAll': 'All',
    'filterNotStudied': 'Not Studied',
    'filterNotTested': 'Not Tested',
    'filterCorrect': 'Correct',
    'filterIncorrect': 'Incorrect',

    // Error/Success Messages
    'error': 'Error',
    'success': 'Success',
    'failedLoadData': 'Failed to load data',
    'failedInitialize': 'Failed to initialize app',
    'failedSaveWord': 'Failed to save word',
    'failedUpdateWord': 'Failed to update word',
    'failedDeleteWord': 'Failed to delete word',
    'noInternet': 'No Internet Connection',
    'noInternetMessage': 'Please connect to the internet to add new words.',
  },
  zh: {
    // Home Screen
    'wordCount': '个词',
    'searchPlaceholder': '搜索中文、拼音或英文...',
    'sortButton': '排序',
    'filterStatus': '筛选',
    'allVocab': '所有词汇',
    'clearAll': '清除全部',
    'addNewWord': '+ 添加新词',
    'noWords': '没有单词',
    'testButton': '测试',
    'selectFolder': '请先选择一个文件夹',
    'noWordsToTest': '没有单词可测试',

    // Sidebar
    'wordCountFormat': '个词，',
    'folderCountFormat': '个文件夹',
    'inputFolderName': '输入文件夹名称',

    // Add Word Screen
    'addWord': '添加单词',
    'chineseLabel': '中文',
    'chinesePlaceholder': '输入中文',
    'pinyinLabel': '拼音',
    'pinyinPlaceholder': '输入拼音',
    'englishLabel': '英文',
    'englishPlaceholder': '输入英文',
    'save': '保存',
    'fillAllFields': '请填写所有字段',
    'wordAdded': '单词已添加',
    'back': '← 返回',

    // Edit Word Screen
    'editWord': '编辑单词',
    'delete': '删除',
    'practiceCount': '练习次数',
    'status': '状态',
    'deleteConfirm': '确定要删除这个单词吗？',
    'cancel': '取消',
    'wordUpdated': '单词已更新',
    'wordDeleted': '单词已删除',

    // Onboarding
    'welcome': '欢迎!',
    'getStarted': '让我们开始吧',
    'namePrompt': '你叫什么名字?',
    'namePlaceholder': '输入你的名字',
    'continue': '继续',
    'createFirstFolder': '创建你的第一个文件夹',
    'createFolderPrompt': '嗨 {username}！让我们创建你的第一个词汇文件夹',
    'folderNameLabel': '文件夹名称',
    'folderNamePlaceholder': '例如，HSK 1级，日常中文',
    'getStartedButton': '开始使用',

    // Sort and Filter Options
    'sortNewest': '最新',
    'sortOldest': '最旧',
    'sortStatus': '状态排序',
    'sortPracticed': '练习次数最多',
    'filterAll': '全部',
    'filterNotStudied': '未学习',
    'filterNotTested': '未测试',
    'filterCorrect': '正确',
    'filterIncorrect': '错误',

    // Error/Success Messages
    'error': '错误',
    'success': '成功',
    'failedLoadData': '加载数据失败',
    'failedInitialize': '应用初始化失败',
    'failedSaveWord': '保存单词失败',
    'failedUpdateWord': '更新单词失败',
    'failedDeleteWord': '删除单词失败',
    'noInternet': '无网络连接',
    'noInternetMessage': '请连接网络后再添加新词。',
  },
};

export const t = (key: string, language: Language, params?: Record<string, string>): string => {
  let text = translations[language][key] || translations.en[key] || key;

  // Replace parameters like {username} with actual values
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(`{${paramKey}}`, paramValue);
    });
  }

  return text;
};
