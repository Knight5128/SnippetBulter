#Requires AutoHotkey v2.0
; UI处理模块 - 负责处理WebView2界面

; 包含WebView2控件库
#Include %A_ScriptDir%\src\lib\WebView2.ahk

; 全局变量
global selectorWindow := {}
global managerWindow := {}

; ==================== WebView2界面函数 ====================

; 初始化WebView2
InitWebView2() {
    ; 检查WebView2运行时是否已安装
    if !WebView2.GetInstalledVersion() {
        result := MsgBox("WebView2运行时未安装，是否现在安装？`n这是显示现代化界面所必需的。", "缺少WebView2运行时", "YesNo Icon!")
        if result = "Yes" {
            ; 打开WebView2下载页面
            Run "https://developer.microsoft.com/microsoft-edge/webview2/"
        }
        return false
    }
    return true
}

; 显示片段选择器界面
ShowSnippetSelector() {
    global selectorWindow
    
    ; 如果窗口已存在但不可见，则显示它
    if IsObject(selectorWindow) && selectorWindow.HasProp("Visible") && !selectorWindow.Visible {
        selectorWindow.Show()
        CenterWindow(selectorWindow)
        return
    }
    
    ; 创建新窗口
    selectorWindow := Gui("+Resize +MinSize400x300 +AlwaysOnTop")
    selectorWindow.Title := "文本片段选择器"
    selectorWindow.MarginX := 0
    selectorWindow.MarginY := 0
    
    ; 创建WebView2控件
    webview := selectorWindow.Add("WebView2", "w600 h500")
    
    ; 设置WebView2事件处理
    webview.Navigate("file:///" A_ScriptDir "\ui\selector.html")
    webview.CoreWebView2.Navigate("file:///" A_ScriptDir "\ui\selector.html")
    
    ; 设置通信处理
    webview.addEventListener("WebMessageReceived", WebView2MessageHandler)
    
    ; 窗口关闭时隐藏而非销毁
    selectorWindow.OnEvent("Close", (*) => (selectorWindow.Hide(), false))
    
    ; 设置Escape键关闭窗口
    selectorWindow.OnEvent("Escape", (*) => selectorWindow.Hide())
    
    ; 显示窗口
    selectorWindow.Show("w600 h500")
    CenterWindow(selectorWindow)
}

; 显示管理面板界面
ShowManagerPanel() {
    global managerWindow
    
    ; 如果窗口已存在但不可见，则显示它
    if IsObject(managerWindow) && managerWindow.HasProp("Visible") && !managerWindow.Visible {
        managerWindow.Show()
        CenterWindow(managerWindow)
        return
    }
    
    ; 创建新窗口
    managerWindow := Gui("+Resize +MinSize800x600")
    managerWindow.Title := "文本片段管理器 - 管理面板"
    managerWindow.MarginX := 0
    managerWindow.MarginY := 0
    
    ; 创建WebView2控件
    webview := managerWindow.Add("WebView2", "w800 h600")
    
    ; 设置WebView2事件处理
    webview.Navigate("file:///" A_ScriptDir "\ui\index.html")
    webview.CoreWebView2.Navigate("file:///" A_ScriptDir "\ui\index.html")
    
    ; 设置通信处理
    webview.addEventListener("WebMessageReceived", WebView2MessageHandler)
    
    ; 窗口关闭时隐藏而非销毁
    managerWindow.OnEvent("Close", (*) => (managerWindow.Hide(), false))
    
    ; 显示窗口
    managerWindow.Show("w800 h600")
    CenterWindow(managerWindow)
}

; WebView2消息处理函数
WebView2MessageHandler(webview, args) {
    try {
        ; 获取消息内容
        message := args.WebMessageAsJson()
        data := Jxon_Load(&message)
        
        ; 处理不同类型的消息
        switch data.action {
            ; 从选择器复制片段
            case "copySnippet":
                CopySnippetToClipboard(data.content)
                if data.autoHide
                    selectorWindow.Hide()
            
            ; 从管理面板读取数据
            case "getData":
                SendDataToWebView(webview)
            
            ; 从管理面板保存数据
            case "saveData":
                if data.HasOwnProp("snippets")
                    SaveSnippetsFromWeb(data.snippets)
                if data.HasOwnProp("settings")
                    SaveSettingsFromWeb(data.settings)
            
            ; 从管理面板添加片段
            case "addSnippet":
                AddSnippet(data.group, data.name, data.content)
                SendDataToWebView(webview)
            
            ; 从管理面板删除片段
            case "deleteSnippet":
                DeleteSnippet(data.group, data.name)
                SendDataToWebView(webview)
            
            ; 从管理面板添加分组
            case "addGroup":
                AddGroup(data.name)
                SendDataToWebView(webview)
            
            ; 从管理面板删除分组
            case "deleteGroup":
                DeleteGroup(data.name)
                SendDataToWebView(webview)
            
            ; 从管理面板重命名分组
            case "renameGroup":
                RenameGroup(data.oldName, data.newName)
                SendDataToWebView(webview)
                
            ; 从管理面板更新设置
            case "updateSettings":
                UpdateSettingsFromWeb(data)
                SendDataToWebView(webview)
        }
    } catch Error as e {
        ; 错误处理
        webview.ExecuteScript("console.error(" Jxon_Dump({error: e.Message}) ");")
    }
}

; 将片段复制到剪贴板
CopySnippetToClipboard(text) {
    A_Clipboard := text
    ToolTip("已复制片段到剪贴板!")
    SetTimer () => ToolTip(), -2000
}

; 将数据发送到WebView
SendDataToWebView(webview) {
    global snippetsData, settings
    
    ; 准备数据对象
    data := {
        snippets: snippetsData,
        settings: settings
    }
    
    ; 转换为JSON并发送到WebView
    jsonData := Jxon_Dump(data)
    webview.ExecuteScript("window.receiveData(" jsonData ");")
}

; 从Web接收并保存片段数据
SaveSnippetsFromWeb(snippets) {
    global snippetsData
    
    ; 更新片段数据
    snippetsData := snippets
    
    ; 保存到文件
    return SaveSnippets()
}

; 从Web接收并保存设置
SaveSettingsFromWeb(newSettings) {
    global settings
    
    ; 更新设置
    for key, value in newSettings
        settings[key] := value
    
    ; 检查热键是否需要更新
    if settings.HasOwnProp("hotkey") && settings.hotkey != oldHotkey {
        UpdateHotkey(oldHotkey, settings.hotkey, ShowSnippetSelector)
    }
    
    ; 保存到文件
    return SaveSettingsToFile()
}

; 更新设置
UpdateSettingsFromWeb(data) {
    global settings
    oldHotkey := settings.hotkey
    
    ; 更新热键设置
    if data.HasOwnProp("hotkey") && data.hotkey != oldHotkey {
        settings.hotkey := data.hotkey
        UpdateHotkey(oldHotkey, settings.hotkey, ShowSnippetSelector)
    }
    
    ; 更新其他设置
    if data.HasOwnProp("autoHide")
        settings.autoHide := data.autoHide
    if data.HasOwnProp("alwaysOnTop")
        settings.alwaysOnTop := data.alwaysOnTop
    
    ; 保存设置
    return SaveSettingsToFile()
}

; 居中显示窗口
CenterWindow(guiObj) {
    guiObj.GetPos(&x, &y, &width, &height)
    guiObj.Move((A_ScreenWidth - width) / 2, (A_ScreenHeight - height) / 2)
} 