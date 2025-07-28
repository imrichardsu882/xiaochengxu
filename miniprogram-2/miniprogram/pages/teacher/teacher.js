// pages/teacher/teacher.js
const storage = require('../../utils/storage.js');
const ROLE_STORAGE_KEY = 'user_role'; // 引入身份标识

Page({
  data: {
    homeworkList: []
  },
  
  onShow() {
    this.loadData();
  },

  loadData() {
    this.setData({
      homeworkList: storage.loadHomeworks().reverse()
    });
  },

  goToCreatePage() {
    wx.navigateTo({
      url: '/pages/create/create',
    })
  },

  goToEditPage(e) {
    const homeworkId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/create/create?id=${homeworkId}`,
    })
  },

  onDeleteTap(e) {
    const homeworkId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，学生也将无法看到此作业。',
      confirmText: '删除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const allHomeworks = storage.loadHomeworks();
          const newHomeworkList = allHomeworks.filter(hw => hw.id !== homeworkId);
          storage.saveHomeworks(newHomeworkList);
          this.loadData();
        }
      }
    })
  },

  /**
   * ★★★ 新增：“切换身份”的逻辑实现 ★★★
   */
  switchRole() {
    wx.showModal({
      title: '确认操作',
      content: '您确定要切换身份并返回门户页吗？',
      success: (res) => {
        if (res.confirm) {
          // 1. 清除本地存储的身份信息
          wx.removeStorageSync(ROLE_STORAGE_KEY);
          // 2. 使用 reLaunch 跳转到门户页，清空所有页面栈，回到初始状态
          wx.reLaunch({
            url: '/pages/index/index',
          });
        }
      }
    });
  }
});