# Text Snippet Manager 

[![AHK Version](https://img.shields.io/badge/AutoHotkey-v2.0-blue)]()

智能文本片段管理解决方案，支持快速调用与扩展插件系统

## ✨ 功能特性
- **快捷片段调用**：通过自定义热键唤出卡片式界面
- **智能分组管理**：树形结构支持无限级嵌套
- **插件生态系统**：
  - 窗口拖拽工具（默认热键：Ctrl+Alt+鼠标拖动）
  - 屏幕虚拟键盘（支持自定义呼出位置）
- **云同步支持**：可选配置OneDrive/Dropbox同步

## 📦 安装指南
### 系统要求
- Windows 10/11 64位
- .NET Framework 4.8+

### 快速开始
1. 下载最新发行版
2. 运行`Setup.exe`
3. 首次运行自动初始化数据库

## 🎮 使用说明
### 基础操作
- **呼出面板**：默认`Win+Shift+S` 
- **快速搜索**：输入时实时过滤
- **分组导航**：`→`展开/`←`折叠

### 插件管理
通过系统托盘图标右键菜单：
1. 选择"插件配置"
2. 勾选需要启用的插件
3. 支持自定义插件热键

## ⚙️ 配置选项
编辑`config.ini`：
```ini
[Hotkeys]
MainPanel=#+s
WindowDrag=^!LButton

[Appearance]
Theme=dark
CardOpacity=95