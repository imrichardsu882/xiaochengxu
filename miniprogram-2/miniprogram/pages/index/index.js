// pages/index/index.js
const ROLE_STORAGE_KEY = 'user_role';
// ★★★ 此处设置教师口令，您可以随时修改 ★★★
const TEACHER_PASSWORD = '123'; // 为了测试方便，设为123

Page({
  data: {
    // 控制密码输入模态框的显示与隐藏
    showPasswordModal: false,
    // 绑定密码输入框的值
    passwordInput: ''
  },
  
  onRoleSelect(e) {
    const selectedRole = e.currentTarget.dataset.role;

    if (selectedRole === 'student') {
      // 学生直接进入
      wx.setStorageSync(ROLE_STORAGE_KEY, selectedRole);
      wx.navigateTo({
        url: '/pages/practice/practice'
      });
    } else if (selectedRole === 'teacher') {
      // 老师则弹出密码框
      this.setData({
        showPasswordModal: true,
        passwordInput: '' // 每次打开都清空输入
      });
    }
  },

  // --- 密码模态框相关函数 ---

  // 监听输入框的输入
  onPasswordInput(e) {
    this.setData({
      passwordInput: e.detail.value
    });
  },

  // 用户点击“确认”
  onPasswordConfirm() {
    if (this.data.passwordInput === TEACHER_PASSWORD) {
      // 密码正确
      this.setData({ showPasswordModal: false });
      wx.setStorageSync(ROLE_STORAGE_KEY, 'teacher');
      wx.navigateTo({
        url: '/pages/teacher/teacher'
      });
    } else {
      // 密码错误
      wx.showToast({
        title: '口令错误',
        icon: 'error',
        duration: 1500
      });
      this.setData({ passwordInput: '' }); // 清空输入框
    }
  },

  // 用户点击“取消”或蒙层
  onPasswordCancel() {
    this.setData({
      showPasswordModal: false
    });
  },

  // 阻止事件冒泡，防止点击模态框内容导致其关闭
  preventModalClose() {}
});