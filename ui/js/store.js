/**
 * SnippetButler存储模块
 * 用于在不同页面之间共享数据和设置
 */

// 应用程序状态
const Store = {
    // 默认数据
    defaultSnippets: {
        "常用": {
            "问候语": "您好，感谢您的来信。",
            "签名": "此致,\n敬礼\n张三"
        },
        "代码": {
            "HTML模板": "<!DOCTYPE html>\n<html>\n<head>\n  <title>标题</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
            "AHK函数": "MyFunction() {\n  MsgBox(\"Hello World\")\n  return true\n}"
        },
        "邮件模板": {
            "会议邀请": "主题：项目讨论会议邀请\n\n尊敬的团队成员：\n\n我们将于本周五下午2点在会议室A举行项目进度讨论会，请准时参加。",
            "工作汇报": "主题：周工作汇报\n\n尊敬的领导：\n\n本周我主要完成了以下工作：\n1. 项目A的需求分析\n2. 项目B的测试计划编写\n3. 与客户C进行了沟通\n\n下周计划：\n1. 完成项目A的设计文档\n2. 开始项目B的单元测试\n\n此致"
        }
    },
    
    // 默认设置
    defaultSettings: {
        "hotkey": "^+Space",
        "autoHide": true,
        "alwaysOnTop": true,
        "scripts": {
            "easy-window-dragging": false,
            "on-screen-keyboard": false
        }
    },
    
    // 当前数据
    snippetsData: {},
    settings: {},
    
    // 开发模式状态
    devMode: false,
    
    /**
     * 初始化存储
     */
    init() {
        // 检查是否在开发模式
        this.devMode = this.checkDevMode();
        
        if (this.devMode) {
            console.log('Store初始化: 运行在开发模式');
            this.loadFromLocalStorage();
        } else {
            // 初始化为默认值，等待从AHK获取数据
            this.resetToDefaults();
        }
        
        return this;
    },
    
    /**
     * 检查是否在开发模式
     */
    checkDevMode() {
        return new URLSearchParams(window.location.search).get('dev') !== null || 
               !window.chrome || 
               !window.chrome.webview;
    },
    
    /**
     * 重置为默认值
     */
    resetToDefaults() {
        this.snippetsData = JSON.parse(JSON.stringify(this.defaultSnippets));
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
    },
    
    /**
     * 从本地存储加载数据
     */
    loadFromLocalStorage() {
        try {
            // 加载片段数据
            const savedSnippets = localStorage.getItem('snippetsData');
            if (savedSnippets) {
                this.snippetsData = JSON.parse(savedSnippets);
                console.info('从本地存储加载片段数据');
            } else {
                this.snippetsData = JSON.parse(JSON.stringify(this.defaultSnippets));
                this.saveSnippetsToStorage();
            }
            
            // 加载设置
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
                console.info('从本地存储加载设置数据');
            } else {
                this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
                this.saveSettingsToStorage();
            }
        } catch (e) {
            console.error('从本地存储加载数据失败:', e);
            this.resetToDefaults();
        }
    },
    
    /**
     * 保存片段数据
     */
    saveSnippets(snippets) {
        this.snippetsData = snippets;
        
        if (this.devMode) {
            this.saveSnippetsToStorage();
            return Promise.resolve();
        } else {
            return new Promise((resolve, reject) => {
                try {
                    if (window.chrome && window.chrome.webview) {
                        window.chrome.webview.postMessage({
                            action: 'saveData',
                            data: snippets
                        });
                        resolve();
                    } else {
                        throw new Error('WebView2环境不可用');
                    }
                } catch (error) {
                    console.error('保存到AHK失败:', error);
                    this.saveSnippetsToStorage();
                    resolve(); // 即使出错也视为成功，因为已保存到本地
                }
            });
        }
    },
    
    /**
     * 保存设置
     */
    saveSettings(settings) {
        this.settings = settings;
        
        if (this.devMode) {
            this.saveSettingsToStorage();
            return Promise.resolve();
        } else {
            return new Promise((resolve, reject) => {
                try {
                    if (window.chrome && window.chrome.webview) {
                        window.chrome.webview.postMessage({
                            action: 'saveSettings',
                            settings: settings
                        });
                        resolve();
                    } else {
                        throw new Error('WebView2环境不可用');
                    }
                } catch (error) {
                    console.error('保存设置到AHK失败:', error);
                    this.saveSettingsToStorage();
                    resolve(); // 即使出错也视为成功，因为已保存到本地
                }
            });
        }
    },
    
    /**
     * 将片段保存到本地存储
     */
    saveSnippetsToStorage() {
        try {
            localStorage.setItem('snippetsData', JSON.stringify(this.snippetsData));
        } catch (e) {
            console.error('保存到本地存储失败:', e);
        }
    },
    
    /**
     * 将设置保存到本地存储
     */
    saveSettingsToStorage() {
        try {
            localStorage.setItem('settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('保存设置到本地存储失败:', e);
        }
    },
    
    /**
     * 复制片段到剪贴板
     */
    copySnippet(content) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.devMode && window.chrome && window.chrome.webview) {
                    // 在AHK环境中
                    window.chrome.webview.postMessage({
                        action: 'copySnippet',
                        content: content,
                        autoHide: this.settings.autoHide
                    });
                    resolve();
                } else {
                    // 在开发模式中
                    // 模拟复制到剪贴板
                    navigator.clipboard.writeText(content)
                        .then(() => resolve())
                        .catch(err => {
                            console.error('复制失败:', err);
                            
                            // 后备方法
                            const textarea = document.createElement('textarea');
                            textarea.value = content;
                            textarea.style.position = 'fixed';
                            document.body.appendChild(textarea);
                            textarea.select();
                            try {
                                document.execCommand('copy');
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                            document.body.removeChild(textarea);
                        });
                }
            } catch (error) {
                console.error('复制操作失败:', error);
                reject(error);
            }
        });
    }
};

// 初始化存储
const store = Store.init(); 