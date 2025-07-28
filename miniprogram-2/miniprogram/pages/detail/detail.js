// pages/detail/detail.js
const storage = require('../../utils/storage.js');
const correctAudio = wx.createInnerAudioContext();
const errorAudio = wx.createInnerAudioContext();
const wordAudio = wx.createInnerAudioContext();

Page({
  data: {
    homework: null,
    totalWords: 0,
    currentWordIndex: 0,
    currentQuestion: null,
    isAnswered: false,
    feedback: { type: '', message: '', sentence: null, sentenceTrans: null },
    userSpellingInput: '',
    spellingFeedbackClass: '',
    progress: 0,
    correctCount: 0,
    isFinished: false,
    score: '0%',
    summaryList: [] // 用于存储最终成绩单
  },

  onLoad: function (options) {
    // ★★★ 防御性编程：检查音频文件路径是否存在 ★★★
    // (实际项目中您需要确保这两个文件在audios目录下)
    correctAudio.src = '/audios/correct-156911.mp3';
    errorAudio.src = '/audios/error-05-199276.mp3';

    const homeworkId = Number(options.id);
    const allHomeworks = storage.loadHomeworks();
    const homework = allHomeworks.find(hw => hw.id === homeworkId);

    if (homework && homework.words.length > 0) {
      this.setData({
        homework: { ...homework, words: this.shuffle(homework.words) },
        totalWords: homework.words.length
      });
      this.generateQuestion();
    } else {
      wx.showToast({ title: '作业加载失败或为空', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  generateQuestion: function () {
    const { homework, currentWordIndex } = this.data;
    const wordInfo = homework.words[currentWordIndex];

    let question = {};
    if (wordInfo.type === 'mc') {
      question = this.generateMcQuestion(wordInfo);
    } else {
      question = this.generateSpQuestion(wordInfo);
    }
    
    this.setData({
      currentQuestion: question,
      isAnswered: false,
      userSpellingInput: '',
      spellingFeedbackClass: '',
      feedback: { type: '', message: '', sentence: null, sentenceTrans: null },
      progress: ((currentWordIndex) / this.data.totalWords) * 100,
    }, () => {
      if (question.type === 'mc') {
        this.playWordAudio();
      }
    });
  },

  // ★★★ 核心修正：智能释义聚合算法 V2.0 ★★★
  aggregateMeanings(meanings, maxLength = 30) {
    if (!meanings || meanings.length === 0) return '暂无释义';
    
    const meaningGroups = meanings.reduce((acc, m) => {
      if (!acc[m.pos]) acc[m.pos] = [];
      acc[m.pos].push(m.def.split(/[;,，；]/)[0]); // 只取第一重意思
      return acc;
    }, {});
    
    let aggregated = [];
    for (const pos in meaningGroups) {
      let currentMeaning = `${pos} ${meaningGroups[pos][0]}`;
      if (aggregated.join('; ').length + currentMeaning.length > maxLength && aggregated.length > 0) {
        break;
      }
      aggregated.push(currentMeaning);
    }

    if (aggregated.length === 0) {
      return meanings[0].def;
    }
    
    let finalString = aggregated.join('; ');
    if (finalString.length > maxLength + 5) {
      return finalString.substring(0, maxLength + 2) + '...';
    }
    return finalString;
  },
  
  generateMcQuestion: function (wordInfo) {
    const correctAnswerDef = this.aggregateMeanings(wordInfo.meanings);
    const distractors = this.data.homework.words.filter(w => w.word !== wordInfo.word);
    let wrongOptions = this.shuffle(distractors).slice(0, 3).map(w => ({
      def: this.aggregateMeanings(w.meanings)
    }));
    
    const options = this.shuffle([
      { def: correctAnswerDef, status: '' },
      ...wrongOptions.map(opt => ({ ...opt, status: '' }))
    ]);
    
    // 异步获取例句并设置
    let sentenceHint = null;
    this.fetchExampleSentence(wordInfo.word).then(sentenceResult => {
      if(sentenceResult && sentenceResult.sentence) {
        this.setData({
          'currentQuestion.sentenceHint': sentenceResult.sentence.replace(new RegExp(wordInfo.word, 'ig'), '______')
        });
      }
    });

    return {
      type: 'mc',
      word: wordInfo.word,
      phonetics: wordInfo.phonetics,
      options: options,
      answer: correctAnswerDef,
      sentenceHint: sentenceHint // 初始为null
    };
  },

  generateSpQuestion: function (wordInfo) {
    return {
      type: 'sp',
      question: this.aggregateMeanings(wordInfo.meanings),
      answer: wordInfo.word,
    };
  },
  
  playWordAudio: function() {
    const word = this.data.currentQuestion.word;
    if (word) {
      wordAudio.src = `https://dict.youdao.com/dictvoice?type=0&audio=${word}`;
      wordAudio.play();
    }
  },

  handleAnswer: function(isCorrect) {
    const wordInfo = this.data.homework.words[this.data.currentWordIndex];
    let feedback = {};

    if(isCorrect) {
      if(correctAudio.src) correctAudio.play();
      this.setData({ correctCount: this.data.correctCount + 1 });
      feedback.type = 'correct';
      feedback.message = '回答正确！';
    } else {
      if(errorAudio.src) errorAudio.play();
      feedback.type = 'incorrect';
      // ★★★ 核心修正：优化错误提示 ★★★
      feedback.message = '别灰心，正确答案已高亮';
    }

    // 更新学习总结列表
    const summaryList = this.data.summaryList;
    summaryList.push({
      word: wordInfo.word,
      def: this.aggregateMeanings(wordInfo.meanings),
      isCorrect: isCorrect
    });
    this.setData({ summaryList });

    // 无论对错，都尝试获取例句
    this.fetchExampleSentence(wordInfo.word).then(sentenceResult => {
      if (sentenceResult && sentenceResult.sentence) {
        feedback.sentence = sentenceResult.sentence;
        feedback.sentenceTrans = sentenceResult.sentenceTrans;
      }
      this.setData({ feedback });
    }).catch(() => {
      this.setData({ feedback }); // 即使API失败，也要更新feedback
    });
  },

  fetchExampleSentence: function(word) {
    // 这是一个免费的例句API，仅供演示。实际生产环境建议替换为更稳定可靠的付费API。
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    return new Promise((resolve, reject) => {
      wx.request({
        url: apiUrl,
        success: (res) => {
          try {
            const sentence = res.data[0].meanings[0].definitions[0].example;
            if (sentence) {
              // 暂时不提供翻译，直接返回英文例句
              resolve({ sentence: sentence, sentenceTrans: "" });
            } else { resolve(null); }
          } catch(e) { resolve(null); }
        },
        fail: (err) => reject(err)
      });
    });
  },

  onMcOptionTap: function (e) {
    if (this.data.isAnswered) return;
    wx.vibrateShort({ type: 'light' });

    const userAnswer = e.currentTarget.dataset.optionDef;
    const correctAnswer = this.data.currentQuestion.answer;
    
    const newOptions = this.data.currentQuestion.options.map(opt => {
      if (opt.def === correctAnswer) opt.status = 'correct';
      else if (opt.def === userAnswer) opt.status = 'incorrect';
      return opt;
    });

    this.setData({
      isAnswered: true,
      'currentQuestion.options': newOptions
    });
    this.handleAnswer(userAnswer === correctAnswer);
  },

  onSpellingSubmit: function() {
    if (this.data.isAnswered || !this.data.userSpellingInput) return;
    wx.vibrateShort({ type: 'light' });
    
    const userAnswer = this.data.userSpellingInput.trim().toLowerCase();
    const correctAnswer = this.data.currentQuestion.answer.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;

    this.setData({
      isAnswered: true,
      spellingFeedbackClass: isCorrect ? 'correct' : 'incorrect',
    });
    this.handleAnswer(isCorrect);
  },

  nextWord: function () {
    if (this.data.currentWordIndex < this.data.totalWords - 1) {
      this.setData({ currentWordIndex: this.data.currentWordIndex + 1 }, () => {
        this.generateQuestion();
      });
    } else {
      this.finishPractice();
    }
  },

  finishPractice: function() {
    this.setData({
      progress: 100,
      isFinished: true,
      score: this.data.totalWords > 0 ? Math.round((this.data.correctCount / this.data.totalWords) * 100) + '%' : '100%'
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  shuffle: function (array) {
    let newArr = [...array]; // 创建副本，避免直接修改原数组
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  },
  
  onSpellingInput: function(e) { this.setData({ userSpellingInput: e.detail.value }); },
});