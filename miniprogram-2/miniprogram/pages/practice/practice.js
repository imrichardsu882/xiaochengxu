// pages/practice/practice.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    homeworks: []
  },

  onShow: function () {
    const homeworksFromStorage = storage.loadHomeworks();
    
    const enhancedHomeworks = homeworksFromStorage.map(hw => {
      const wordCount = hw.words.length;
      const estimatedTimeInSeconds = wordCount * 20;
      const estimatedMinutes = Math.ceil(estimatedTimeInSeconds / 60);

      return {
        ...hw,
        wordCount: wordCount,
        estimatedTime: estimatedMinutes
      };
    }).reverse();

    this.setData({
      homeworks: enhancedHomeworks
    });
  },

  /**
   * ★★★ 核心修正：新增与 wxml 中 'bindtap' 对应的跳转函数 ★★★
   */
  startPractice: function (e) {
    const homeworkId = e.currentTarget.dataset.id;
    // 使用 wx.navigateTo API 进行页面跳转，确保万无一失
    wx.navigateTo({
      url: `/pages/detail/detail?id=${homeworkId}`
    });
  }
});