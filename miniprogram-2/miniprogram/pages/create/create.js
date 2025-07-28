const storage = require('../../utils/storage.js');
const DELETE_THRESHOLD = 60;

Page({
  data: {
    isEditMode: false,
    homeworkId: null,
    homeworkTitle: '',
    wordToSearch: '',
    searchResult: null,
    wordListForHomework: [],
  },
  
  // --- 核心修正：完整地、正确地恢复了 onLoad 函数 ---
  onLoad(options) {
    if (options.id) {
      // 编辑模式
      const homeworkId = Number(options.id);
      const allHomeworks = storage.loadHomeworks();
      const homeworkToEdit = allHomeworks.find(hw => hw.id === homeworkId);
      
      if (homeworkToEdit) {
        const wordsWithPosition = homeworkToEdit.words.map(w => ({ ...w, x: 0 }));
        this.setData({
          isEditMode: true,
          homeworkId: homeworkId,
          homeworkTitle: homeworkToEdit.name,
          wordListForHomework: wordsWithPosition
        });
        wx.setNavigationBarTitle({ title: '编辑作业' });
      }
    } else {
      // 新建模式
      wx.setNavigationBarTitle({ title: '创建新作业' });
    }
  },

  onTitleInput(e) { this.setData({ homeworkTitle: e.detail.value }); },
  onWordInput(e) { this.setData({ wordToSearch: e.detail.value.trim().toLowerCase() }); },
  async searchWord() {
      if (!this.data.wordToSearch) return;
      wx.showLoading({ title: '智能查询中...' });
      try {
          const res = await new Promise((resolve, reject) => {
              wx.request({
                  url: `https://dict.youdao.com/jsonapi?q=${this.data.wordToSearch}`,
                  success: resolve,
                  fail: reject
              });
          });
          const parsedResult = this.parseYoudaoData(res.data, this.data.wordToSearch);
          if (parsedResult && parsedResult.meanings.length > 0) {
              this.setData({ searchResult: parsedResult });
          } else {
              wx.showToast({ title: '未找到该单词的详细释义', icon: 'none' });
              this.setData({ searchResult: null });
          }
      } catch (err) {
          wx.showToast({ title: '查询失败,请检查网络', icon: 'error' });
      } finally {
          wx.hideLoading();
      }
  },
  parseYoudaoData(data, originalWord) {
      try {
          if (!data.ec || !data.ec.word || !data.ec.word[0]) return null;
          const wordData = data.ec.word[0];
          const meanings = [];
          if (wordData.trs) {
              wordData.trs.forEach(tr => {
                  const translation = tr.tr && tr.tr[0] && tr.tr[0].l && tr.tr[0].l.i && tr.tr[0].l.i[0];
                  if (translation) {
                      const parts = translation.match(/^([a-z]+\.)\s*(.*)$/);
                      if(parts && parts.length === 3){
                          meanings.push({ pos: parts[1], def: parts[2], sentence: '' });
                      }
                  }
              });
          }
          if (meanings.length > 0) {
              return {
                  id: Date.now(),
                  word: originalWord,
                  phonetics: `[${wordData.ukphone || ''}]`,
                  type: Math.random() > 0.5 ? 'mc' : 'sp',
                  meanings: meanings
              };
          }
          return null;
      } catch (error) {
          console.error("解析数据失败:", error);
          return null;
      }
  },
  addWordToHomework() {
      if (!this.data.searchResult) return;
      if (this.data.wordListForHomework.some(w => w.word === this.data.searchResult.word)) {
          wx.showToast({ title: '单词已在列表中', icon: 'none' });
          return;
      }
      const newWord = { ...this.data.searchResult, x: 0 };
      const newWordList = this.data.wordListForHomework.concat(newWord);
      this.setData({
          wordListForHomework: newWordList,
          searchResult: null,
          wordToSearch: ''
      });
      wx.showToast({ title: `「${this.data.searchResult.word}」已添加`, icon: 'success', duration: 1000 });
  },
  onSlide(e) {
      const index = e.currentTarget.dataset.index;
      const x = e.detail.x;
      if (e.detail.source === 'touch') {
          this.data.wordListForHomework.forEach((item, i) => {
              if (i !== index) item.x = 0;
          });
          this.setData({ wordListForHomework: this.data.wordListForHomework });
      } else if (e.detail.source === 'touch-out-of-bounds' || e.detail.source === 'friction') {
          this.data.wordListForHomework[index].x = x < -DELETE_THRESHOLD ? -80 : 0;
          this.setData({ wordListForHomework: this.data.wordListForHomework });
      }
  },
  removeWord(e) {
      const wordToRemove = e.currentTarget.dataset.word;
      const newWordList = this.data.wordListForHomework.filter(w => w.word !== wordToRemove);
      this.setData({
          wordListForHomework: newWordList
      });
  },
  publishHomework() {
      const title = this.data.homeworkTitle.trim();
      if (!title) { wx.showToast({ title: '请输入作业标题', icon: 'none' }); return; }
      if (this.data.wordListForHomework.length === 0) { wx.showToast({ title: '请先添加单词', icon: 'none' }); return; }
      
      const allHomeworks = storage.loadHomeworks();
      const wordsToSave = this.data.wordListForHomework.map(item => ({
          id: item.id, word: item.word, phonetics: item.phonetics,
          type: item.type, meanings: item.meanings
      }));

      if (this.data.isEditMode) {
          const index = allHomeworks.findIndex(hw => hw.id === this.data.homeworkId);
          if (index !== -1) {
              allHomeworks[index].name = title;
              allHomeworks[index].words = wordsToSave;
          }
      } else {
          const newHomework = { id: Date.now(), name: title, words: wordsToSave };
          allHomeworks.push(newHomework);
      }
      storage.saveHomeworks(allHomeworks);
      wx.showToast({ title: this.data.isEditMode ? '保存成功！' : '发布成功！', icon: 'success' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
  }
});