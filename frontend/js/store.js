/**
 * SnippetButler存储模块
 * 用于在不同页面之间共享数据和设置，并与C#后端通信
 */

// 应用程序状态
const Store = {
  // 移除默认数据
  // defaultSnippets: { ... },
  // defaultSettings: { ... },

  // 当前数据 - 初始化为空对象，等待后端加载
  snippetsData: {},
  settings: {},

  // 开发模式状态
  devMode: false,

  /**
   * 初始化存储
   */
  init() {
    console.log("===== 初始化Store模块 =====");
    
    // 检查是否在开发模式
    this.devMode = this.checkDevMode();
    console.log("Store初始化: 开发模式 =", this.devMode);

    if (this.devMode) {
      console.log("Store初始化: 运行在开发模式。将尝试从本地存储加载数据作为后备。");
      // 开发模式下，尝试从本地存储加载，如果没有则为空
      this.loadFromLocalStorageDevMode();
    } else {
      console.log("Store初始化: 运行在正常模式。等待后端数据...");
      // 正常模式下，数据将由C#后端通过消息提供
      this.snippetsData = {};
      this.settings = {};
      
      // WebView2通信检查
      if (window.chrome && window.chrome.webview) {
        console.log("Store: WebView2环境已检测到");
        try {
          // 为WebView2添加全局消息处理器，可能会在main.js之前捕获消息
          window.addEventListener("message", this.handleWebViewMessage.bind(this));
        } catch (err) {
          console.warn("Store: 添加全局消息处理器失败:", err);
        }
      } else {
        console.warn("Store: 未检测到WebView2环境");
      }
    }
    
    console.log("Store初始化完成, 数据状态:", {
      snippetsData: Object.keys(this.snippetsData),
      settings: this.settings ? Object.keys(this.settings) : null
    });

    return this;
  },

  /**
   * 检查是否在开发模式
   */
  checkDevMode() {
    // 如果URL包含 ?dev=true，或者无法访问 WebView2 环境，则视为开发模式
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get("dev") === "true" || !window.chrome || !window.chrome.webview;
    console.log("检查开发模式:", isDev, {
      'dev参数': urlParams.get("dev"),
      'WebView2可用': Boolean(window.chrome && window.chrome.webview)
    });
    return isDev;
  },

  // 移除 resetToDefaults 函数，不再需要
  // resetToDefaults() { ... },

  /**
   * 处理来自WebView2的消息
   */
  handleWebViewMessage(event) {
    try {
      console.log("Store收到WebView消息:", typeof event.data);
      let data = event.data;
      
      // 如果是字符串，尝试解析为JSON
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (err) {
          console.warn("Store: 无法解析WebView消息:", err);
          return;
        }
      }
      
      // 检查是否包含片段数据
      if (data && data.data) {
        console.log("Store: 收到片段数据, 分组数:", Object.keys(data.data).length);
        this.snippetsData = data.data;
      }
      
      // 检查是否包含设置数据
      if (data && data.settings) {
        console.log("Store: 收到设置数据");
        this.settings = data.settings;
      }
    } catch (err) {
      console.error("Store: 处理WebView消息失败:", err);
    }
  },

  /**
   * (仅限开发模式) 从本地存储加载数据
   */
  loadFromLocalStorageDevMode() {
    try {
      console.log("(开发模式) 尝试从本地存储加载数据");
      const savedSnippets = localStorage.getItem("snippetsData");
      this.snippetsData = savedSnippets ? JSON.parse(savedSnippets) : {};
      if (Object.keys(this.snippetsData).length > 0) {
        console.info("(开发模式) 从本地存储加载片段数据成功");
      } else {
        console.info("(开发模式) 本地存储中没有片段数据");
      }

      const savedSettings = localStorage.getItem("settings");
      this.settings = savedSettings ? JSON.parse(savedSettings) : { 
        hotkey: "^+Space", 
        autoHide: true, 
        alwaysOnTop: true, 
        scripts: { 
          "easy-window-dragging": false, 
          "on-screen-keyboard": false 
        } 
      };
      if (Object.keys(this.settings).length > 2) { // 检查是否不仅仅是默认键
        console.info("(开发模式) 从本地存储加载设置数据成功");
      } else {
        console.info("(开发模式) 本地存储中没有设置数据，使用基础默认设置");
        this.saveSettingsToStorage(); // 保存基础默认设置
      }
    } catch (e) {
      console.error("(开发模式) 从本地存储加载数据失败:", e);
      this.snippetsData = {};
      this.settings = { 
        hotkey: "^+Space", 
        autoHide: true, 
        alwaysOnTop: true, 
        scripts: { 
          "easy-window-dragging": false, 
          "on-screen-keyboard": false 
        } 
      };
    }
  },

  /**
   * 保存片段数据 - 发送给后端
   */
  saveSnippets(snippets) {
    this.snippetsData = snippets;
    console.log("准备保存片段数据...");

    if (this.devMode) {
      console.log("(开发模式) 将片段数据保存到本地存储");
      this.saveSnippetsToStorage();
      return Promise.resolve(); // 开发模式下模拟成功
    } else {
      console.log("向后端发送 'saveData' 请求");
      return new Promise((resolve, reject) => {
        try {
          if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
              action: "saveData",
              data: snippets,
            });
            console.log("'saveData' 请求已发送");
            resolve();
          } else {
            console.error("保存片段失败: WebView2环境不可用");
            reject(new Error("WebView2环境不可用"));
          }
        } catch (error) {
          console.error("发送 'saveData' 请求失败:", error);
          // 即使发送失败，也尝试保存到本地存储作为后备（仅开发模式？）
          // 生产模式下应该报错
          if (this.devMode) {
             this.saveSnippetsToStorage();
             resolve(); // 认为是成功
          } else {
             reject(error);
          }
        }
      });
    }
  },

  /**
   * 保存设置 - 发送给后端
   */
  saveSettings(settings) {
    this.settings = settings;
    console.log("准备保存设置数据...");

    if (this.devMode) {
      console.log("(开发模式) 将设置数据保存到本地存储");
      this.saveSettingsToStorage();
      return Promise.resolve(); // 开发模式下模拟成功
    } else {
      console.log("向后端发送 'saveSettings' 请求");
      return new Promise((resolve, reject) => {
        try {
          if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
              action: "saveSettings",
              settings: settings,
            });
            console.log("'saveSettings' 请求已发送");
            resolve();
          } else {
            console.error("保存设置失败: WebView2环境不可用");
            reject(new Error("WebView2环境不可用"));
          }
        } catch (error) {
          console.error("发送 'saveSettings' 请求失败:", error);
          if (this.devMode) {
             this.saveSettingsToStorage();
             resolve(); // 认为是成功
          } else {
             reject(error);
          }
        }
      });
    }
  },

  /**
   * (开发模式) 将片段保存到本地存储
   */
  saveSnippetsToStorage() {
    if (!this.devMode) return; // 确保只在开发模式下执行
    try {
      localStorage.setItem("snippetsData", JSON.stringify(this.snippetsData));
      console.log("(开发模式) 片段数据已保存到本地存储");
    } catch (e) {
      console.error("(开发模式) 保存片段到本地存储失败:", e);
    }
  },

  /**
   * (开发模式) 将设置保存到本地存储
   */
  saveSettingsToStorage() {
    if (!this.devMode) return; // 确保只在开发模式下执行
    try {
      localStorage.setItem("settings", JSON.stringify(this.settings));
      console.log("(开发模式) 设置已保存到本地存储");
    } catch (e) {
      console.error("(开发模式) 保存设置到本地存储失败:", e);
    }
  },

  /**
   * 复制片段到剪贴板
   */
  copySnippet(content) {
    console.log("请求复制片段...");
    return new Promise((resolve, reject) => {
      try {
        if (!this.devMode && window.chrome && window.chrome.webview) {
          // 在正常模式下，发送消息给后端处理
          console.log("向后端发送 'copySnippet' 请求");
          window.chrome.webview.postMessage({
            action: "copySnippet",
            content: content,
            autoHide: this.settings.autoHide, // 传递 autoHide 设置
          });
          resolve();
        } else {
          // 在开发模式中，直接使用浏览器API
          console.log("(开发模式) 使用浏览器 API 复制");
          navigator.clipboard
            .writeText(content)
            .then(() => {
              console.log("(开发模式) 复制成功");
              resolve();
            })
            .catch((err) => {
              console.error("(开发模式) 复制失败:", err);
              // 后备方法 (旧版浏览器可能需要)
              try {
                const textarea = document.createElement("textarea");
                textarea.value = content;
                textarea.style.position = "fixed"; // 防止干扰页面布局
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                console.log("(开发模式) 使用后备方法复制成功");
                resolve();
              } catch (e) {
                console.error("(开发模式) 后备复制方法失败:", e);
                reject(e);
              }
            });
        }
      } catch (error) {
        console.error("复制操作中发生错误:", error);
        reject(error);
      }
    });
  },
};

// 初始化存储并设置为全局变量
const store = Store.init();
window.store = store; // 将store暴露为全局变量

