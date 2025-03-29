# 文本片段管理器 (Text Snippet Manager)

一个高效管理文本片段的桌面工具，使用AutoHotkey v2开发，帮助您快速存储、组织和重用常用文本内容。

## 主要功能

- 文本片段的分组管理
- 全局快捷键快速调用片段选择器
- 快速搜索片段
- 现代化WebView2界面
- 支持集成外部AutoHotkey脚本

## 技术实现

- 后端：AutoHotkey v2
- 前端：HTML, CSS, JavaScript + WebView2
- 数据存储：JSON文件

## 系统要求

- Windows 10/11
- [AutoHotkey v2](https://www.autohotkey.com/)
- [WebView2运行时](https://developer.microsoft.com/microsoft-edge/webview2/)

## 使用方法

1. 克隆或下载本仓库
2. 运行`Text-Snippet-Manager.ahk`
3. 按下默认快捷键`Ctrl+Shift+Space`唤出片段选择器
4. 右键点击系统托盘图标可打开管理面板

## 文件夹结构

```
text-snippet-manager/
├── Text-Snippet-Manager.ahk  # 主程序文件
├── src/                      # AHK源码目录
│   ├── data_manager.ahk      # 数据管理模块
│   ├── hotkey_manager.ahk    # 热键管理模块
│   ├── ui_handler.ahk        # UI处理模块
│   ├── script_integrator.ahk # 脚本集成模块
│   └── lib/                  # 库文件
│       ├── Jxon.ahk          # JSON处理库
│       └── WebView2.ahk      # WebView2控件库
├── ui/                       # 前端界面文件
│   ├── selector.html         # 片段选择器界面
│   ├── index.html            # 管理面板界面
│   ├── css/                  # 样式文件
│   │   └── style.css
│   └── js/                   # 脚本文件
│       ├── selector.js
│       └── main.js
├── integrated_scripts/       # 集成的外部脚本
│   ├── easy-window-dragging.ahk
│   └── on-screen-keyboard.ahk
├── data/                     # 数据存储目录(运行时创建)
│   ├── snippets.json
│   └── settings.json
└── icon/                     # 图标资源
    └── icon.png
```

## 快捷键

- `Ctrl+Shift+Space`：显示片段选择器
- `Esc`：关闭片段选择器
- 在选择器中双击片段：复制片段到剪贴板

## 许可证

MIT 