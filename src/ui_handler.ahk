#Requires AutoHotkey v2.0
; UI处理模块 - 负责处理WebView2界面与jQuery交互

; 包含WebView2控件库
#Include %A_ScriptDir%\src\lib\WebView2.ahk

; 加载必要的 COM 组件
#DllLoad "ole32.dll"
#DllLoad "oleaut32.dll"

; 全局变量
global selectorWindow := {}
global managerWindow := {}
global hotkeyEnabled := false
global currentHotkey := ""

; ==================== WebView2界面函数 ====================

; 初始化WebView2
InitWebView2() {
    try {
        ; 检查WebView2运行时是否已安装
        if !WebView2.GetInstalledVersion() {
            result := MsgBox("WebView2运行时未安装，是否现在安装？`n这是显示现代化界面所必需的。", "缺少WebView2运行时", "YesNo Icon!")
            if result = "Yes" {
                ; 下载并安装 WebView2 运行时
                bootstrapperUrl := "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
                bootstrapperPath := A_Temp "\MicrosoftEdgeWebview2Setup.exe"
                
                ; 下载安装程序
                try {
                    Download bootstrapperUrl, bootstrapperPath
                } catch Error as e {
                    MsgBox("下载 WebView2 运行时失败。`n错误信息: " e.Message, "错误", "Icon!")
                    return false
                }
                
                ; 运行安装程序
                try {
                    RunWait bootstrapperPath " /silent /install"
                    FileDelete bootstrapperPath
                } catch Error as e {
                    MsgBox("安装 WebView2 运行时失败。`n错误信息: " e.Message, "错误", "Icon!")
                    return false
                }
                
                ; 等待安装完成
                loop 10 {
                    if WebView2.GetInstalledVersion()
                        break
                    Sleep 1000
                }
                
                if !WebView2.GetInstalledVersion() {
                    MsgBox("WebView2 运行时安装可能未完成，请重启应用。", "警告", "Icon!")
                    return false
                }
            } else {
                return false
            }
        }
        
        ; 尝试初始化 COM
        if !DllCall("ole32\CoInitialize", "Ptr", 0) {
            MsgBox("初始化COM组件失败。`n错误代码: " A_LastError, "错误", "Icon!")
            return false
        }
        
        ; 尝试从系统目录加载 WebView2Loader.dll
        dllPath := "C:\Windows\SysWOW64\WebView2Loader.dll"
        if !FileExist(dllPath) {
            MsgBox("找不到 WebView2Loader.dll，请确保 WebView2 运行时已正确安装。", "错误", "Icon!")
            return false
        }
        
        ; 加载 DLL
        hModule := DllCall("LoadLibrary", "Str", dllPath, "Ptr")
        if !hModule {
            MsgBox("加载 WebView2Loader.dll 失败。错误代码: " A_LastError, "错误", "Icon!")
            return false
        }
        
        ; 获取创建环境的函数地址
        CreateCoreWebView2Environment := DllCall("GetProcAddress", "Ptr", hModule, "AStr", "CreateCoreWebView2Environment", "Ptr")
        if !CreateCoreWebView2Environment {
            MsgBox("获取 CreateCoreWebView2Environment 函数失败。错误代码: " A_LastError, "错误", "Icon!")
            return false
        }
        
        ; 确保UI目录存在
        uiDir := A_ScriptDir "\ui"
        if !DirExist(uiDir) {
            DirCreate(uiDir)
            DirCreate(uiDir "\css")
            DirCreate(uiDir "\js")
        }
        
        return true
    } catch Error as e {
        MsgBox("初始化WebView2失败。`n错误信息: " e.Message "`n错误代码: " e.Extra, "错误", "Icon!")
        return false
    }
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
    
    try {
        ; 创建 WebView2 环境
        dllPath := "C:\Windows\SysWOW64\WebView2Loader.dll"
        if !FileExist(dllPath) {
            MsgBox("找不到 WebView2Loader.dll，请确保 WebView2 运行时已正确安装。", "错误", "Icon!")
            return
        }
        
        ; 加载 DLL
        hModule := DllCall("LoadLibrary", "Str", dllPath, "Ptr")
        if !hModule {
            MsgBox("加载 WebView2Loader.dll 失败。错误代码: " A_LastError, "错误", "Icon!")
            return
        }
        
        ; 获取创建环境的函数地址
        CreateCoreWebView2Environment := DllCall("GetProcAddress", "Ptr", hModule, "AStr", "CreateCoreWebView2Environment", "Ptr")
        if !CreateCoreWebView2Environment {
            MsgBox("获取 CreateCoreWebView2Environment 函数失败。错误代码: " A_LastError, "错误", "Icon!")
            return
        }
        
        ; 创建环境
        hr := DllCall(CreateCoreWebView2Environment, "Ptr", 0, "Ptr", 0, "Ptr", 0, "Ptr*", &env := 0)
        if (hr != 0) {
            MsgBox("创建 WebView2 环境失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 创建 WebView2 控件
        hr := DllCall(env.vt[6], "Ptr", env, "Ptr", selectorWindow.Hwnd, "Ptr*", &controller := 0)
        if (hr != 0) {
            MsgBox("创建 WebView2 控件失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 获取 CoreWebView2
        hr := DllCall(controller.vt[5], "Ptr", controller, "Ptr*", &webview := 0)
        if (hr != 0) {
            MsgBox("获取 CoreWebView2 失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 导航到页面
        DllCall(webview.vt[7], "Ptr", webview, "WStr", "https://text-snippet-manager.vercel.app/selector.html")
        
        ; 保存对象到窗口
        selectorWindow.env := env
        selectorWindow.controller := controller
        selectorWindow.webview := webview
    } catch Error as e {
        MsgBox("创建WebView2控件失败。`n错误信息: " e.Message "`n错误代码: " e.Extra, "错误", "Icon!")
        return
    }
    
    ; 窗口关闭时隐藏而非销毁
    selectorWindow.OnEvent("Close", (*) => (selectorWindow.Hide(), false))
    
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
    
    try {
        ; 创建 WebView2 环境
        dllPath := "C:\Windows\SysWOW64\WebView2Loader.dll"
        if !FileExist(dllPath) {
            MsgBox("找不到 WebView2Loader.dll，请确保 WebView2 运行时已正确安装。", "错误", "Icon!")
            return
        }
        
        ; 加载 DLL
        hModule := DllCall("LoadLibrary", "Str", dllPath, "Ptr")
        if !hModule {
            MsgBox("加载 WebView2Loader.dll 失败。错误代码: " A_LastError, "错误", "Icon!")
            return
        }
        
        ; 获取创建环境的函数地址
        CreateCoreWebView2Environment := DllCall("GetProcAddress", "Ptr", hModule, "AStr", "CreateCoreWebView2Environment", "Ptr")
        if !CreateCoreWebView2Environment {
            MsgBox("获取 CreateCoreWebView2Environment 函数失败。错误代码: " A_LastError, "错误", "Icon!")
            return
        }
        
        ; 创建环境
        hr := DllCall(CreateCoreWebView2Environment, "Ptr", 0, "Ptr", 0, "Ptr", 0, "Ptr*", &env := 0)
        if (hr != 0) {
            MsgBox("创建 WebView2 环境失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 创建 WebView2 控件
        hr := DllCall(env.vt[6], "Ptr", env, "Ptr", managerWindow.Hwnd, "Ptr*", &controller := 0)
        if (hr != 0) {
            MsgBox("创建 WebView2 控件失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 获取 CoreWebView2
        hr := DllCall(controller.vt[5], "Ptr", controller, "Ptr*", &webview := 0)
        if (hr != 0) {
            MsgBox("获取 CoreWebView2 失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 导航到页面
        DllCall(webview.vt[7], "Ptr", webview, "WStr", "https://text-snippet-manager.vercel.app/ui/index.html")
        
        ; 保存对象到窗口
        managerWindow.env := env
        managerWindow.controller := controller
        managerWindow.webview := webview
    } catch Error as e {
        MsgBox("创建WebView2控件失败。`n错误信息: " e.Message "`n错误代码: " e.Extra, "错误", "Icon!")
        return
    }
    
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
        switch data.type {
            ; 切换全局快捷键
            case "toggleGlobalHotkey":
                ToggleGlobalHotkey(data.enabled, data.hotkey)
            
            ; 设置全局快捷键
            case "setGlobalHotkey":
                SetGlobalHotkey(data.hotkey)
            
            ; 从选择器复制片段
            case "copySnippet":
                CopySnippetToClipboard(data.content)
                if data.autoHide
                    selectorWindow.Hide()
            
            ; 关闭窗口
            case "close":
                selectorWindow.Hide()
            
            ; 从管理面板读取数据
            case "getData":
                SendDataToWebView(webview)
            
            ; 保存所有数据
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
                UpdateSettingsFromWeb(data.settings)
                SendDataToWebView(webview)
                
            ; 切换集成脚本
            case "toggleScript":
                ToggleScript(data.name)
                SendDataToWebView(webview)
                
            ; 开始录制热键
            case "startRecordHotkey":
                StartRecordHotkey(webview)
            
            ; 停止录制热键
            case "stopRecordHotkey":
                StopRecordHotkey(webview)
        }
    } catch Error as e {
        ; 错误处理
        webview.ExecuteScript("console.error(" Jxon_Dump({error: e.Message}) ");")
    }
}

; 切换全局快捷键
ToggleGlobalHotkey(enabled, hotkey) {
    global hotkeyEnabled, currentHotkey
    
    hotkeyEnabled := enabled
    if (enabled && hotkey) {
        SetGlobalHotkey(hotkey)
    } else {
        DisableGlobalHotkey()
    }
}

; 设置全局快捷键
SetGlobalHotkey(hotkey) {
    global currentHotkey, hotkeyEnabled
    
    ; 如果已有快捷键，先禁用
    if (currentHotkey) {
        try {
            Hotkey(currentHotkey, "Off")
        }
    }
    
    ; 如果启用了快捷键功能，设置新的快捷键
    if (hotkeyEnabled && hotkey) {
        try {
            Hotkey(hotkey, ShowSnippetSelector, "On")
            currentHotkey := hotkey
        } catch Error as e {
            MsgBox("设置快捷键失败: " e.Message)
        }
    }
}

; 禁用全局快捷键
DisableGlobalHotkey() {
    global currentHotkey
    
    if (currentHotkey) {
        try {
            Hotkey(currentHotkey, "Off")
            currentHotkey := ""
        }
    }
}

; 将数据发送到WebView
SendDataToWebView(webview) {
    global snippetsData, settings, hotkeyEnabled, currentHotkey
    
    ; 准备数据对象
    data := {
        snippets: snippetsData,
        settings: settings,
        hotkeyEnabled: hotkeyEnabled,
        currentHotkey: currentHotkey
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
    settings := newSettings
    
    ; 保存到文件
    return SaveSettingsToFile()
}

; 更新设置
UpdateSettingsFromWeb(newSettings) {
    global settings
    
    ; 更新所有设置
    settings := newSettings
    
    ; 保存设置
    return SaveSettingsToFile()
}

; 开始录制热键
StartRecordHotkey(webview) {
    ; 这里可以实现热键录制功能
    ; 简化实现为演示目的
    static keyHandler := {}
    
    keyHandler := InputHook("L1")
    keyHandler.Start()
    
    ; 假设1秒后接收到热键组合^!Z
    SetTimer(() => 
        webview.ExecuteScript("window.setRecordedHotkey('^!Z');")
    , -1000)
}

; 停止录制热键
StopRecordHotkey(webview) {
    ; 停止录制热键
    ; 实际实现需要停止InputHook
}

; 将片段复制到剪贴板
CopySnippetToClipboard(text) {
    A_Clipboard := text
    ToolTip("已复制片段到剪贴板!")
    SetTimer () => ToolTip(), -2000
}

; 居中显示窗口
CenterWindow(guiObj) {
    guiObj.GetPos(&x, &y, &width, &height)
    guiObj.Move((A_ScreenWidth - width) / 2, (A_ScreenHeight - height) / 2)
} 