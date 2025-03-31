#Requires AutoHotkey v2.0
; WebView2控件库 for AutoHotkey v2.0
; 提供创建和管理WebView2的功能

; WebView2控件类
Class WebView2 {
    ; WebView2控件实例
    instance := {}
    hwnd := 0
    
    ; WebView2环境
    env := ""
    controller := ""
    webview2 := ""
    
    ; 事件处理函数
    eventHandlers := Map()
    
    ; 构造函数
    __New(guiCtrl) {
        ; 存储控件实例
        this.hwnd := guiCtrl.Hwnd
        this.instance := guiCtrl
        
        ; 初始化WebView2环境
        if !this.InitEnvironment()
            throw Error("Failed to initialize WebView2 environment")
            
        ; 返回this以支持方法链式调用
        return this
    }
    
    ; 初始化WebView2环境
    InitEnvironment() {
        try {
            ; 创建WebView2环境
            DllCall("ole32\CoInitialize", "Ptr", 0)
            
            ; 创建环境选项
            this.env := ComObject("{A0D6F4B1-84B8-4E49-9B8C-2EA5C5C6A1F8}")
            
            ; 创建控制器
            this.controller := this.env.CreateCoreWebView2Controller(this.hwnd)
            if !this.controller
                throw Error("Failed to create WebView2 controller")
                
            ; 获取WebView2实例
            this.webview2 := this.controller.CoreWebView2
            if !this.webview2
                throw Error("Failed to get CoreWebView2")
                
        } catch Error as e {
            MsgBox("创建WebView2环境失败，请确保已安装WebView2运行时。`n错误: " e.Message, "错误", "Icon!")
            return false
        }
        
        return true
    }
    
    ; 导航到指定URL
    Navigate(url) {
        if !this.webview2
            return false
            
        try {
            this.webview2.Navigate(url)
        } catch Error as e {
            MsgBox("导航到URL失败: " url "`n错误: " e.Message, "错误", "Icon!")
            return false
        }
        
        return true
    }
    
    ; 添加事件监听器
    addEventListener(eventName, callback) {
        ; 存储事件处理函数
        if !this.eventHandlers.Has(eventName)
            this.eventHandlers[eventName] := []
            
        this.eventHandlers[eventName].Push(callback)
        
        ; 注册事件到WebView2
        if eventName = "WebMessageReceived" {
            try {
                script := '
                (
                    window.chrome.webview.postMessage = function(data) {
                        window.chrome.webview.postMessage(JSON.stringify(data));
                    };
                )'
                this.webview2.AddScriptToExecuteOnDocumentCreated(script)
                this.webview2.WebMessageReceived := this.OnWebMessageReceived.Bind(this)
            } catch Error as e {
                MsgBox("添加WebMessage监听器失败`n错误: " e.Message, "错误", "Icon!")
                return false
            }
        }
        
        return true
    }
    
    ; WebMessage接收处理
    OnWebMessageReceived(sender, args) {
        if this.eventHandlers.Has("WebMessageReceived") {
            for callback in this.eventHandlers["WebMessageReceived"]
                callback(this, args)
        }
    }
    
    ; 执行JavaScript代码
    ExecuteScript(script) {
        if !this.webview2
            return false
            
        try {
            this.webview2.ExecuteScript(script)
        } catch Error as e {
            MsgBox("执行JavaScript失败`n错误: " e.Message, "错误", "Icon!")
            return false
        }
        
        return true
    }
    
    ; 获取CoreWebView2对象
    CoreWebView2 {
        get {
            return this.webview2
        }
    }
    
    ; 创建WebView2环境(静态方法)
    static CreateEnvironment() {
        ; 检查WebView2运行时是否已安装
        if !WebView2.GetInstalledVersion()
            throw Error("WebView2运行时未安装")
            
        ; 创建WebView2环境
        try {
            ; 创建WebView2环境适配器
            return {
                NavigateTo: (hwnd, url) => WebView2.NavigateToUrl(hwnd, url),
                ExecuteScript: (hwnd, script) => WebView2.ExecuteJavaScript(hwnd, script),
                AddWebMessageListener: (hwnd, channelName, allowedOrigins) => WebView2.AddMessageListener(hwnd, channelName, allowedOrigins)
            }
        } catch Error as e {
            throw Error("创建WebView2环境失败: " e.Message)
        }
    }
    
    ; 获取WebView2运行时版本(静态方法)
    static GetInstalledVersion() {
        ; 检查系统级别的安装
        regPaths := [
            ; Stable Channel
            "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            ; Beta Channel
            "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{2CD8A007-E189-409D-A2C8-9AF4EF3C72AA}",
            ; Dev Channel
            "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{0D50BFEC-CD6A-4F9A-964C-C7416E3ACB10}",
            ; Canary Channel
            "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{65C35B14-6C1D-4122-AC46-7148CC9D6497}"
        ]
        
        ; 检查用户级别的安装
        userRegPaths := [
            ; Stable Channel
            "HKCU\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            ; Beta Channel
            "HKCU\SOFTWARE\Microsoft\EdgeUpdate\Clients\{2CD8A007-E189-409D-A2C8-9AF4EF3C72AA}",
            ; Dev Channel
            "HKCU\SOFTWARE\Microsoft\EdgeUpdate\Clients\{0D50BFEC-CD6A-4F9A-964C-C7416E3ACB10}",
            ; Canary Channel
            "HKCU\SOFTWARE\Microsoft\EdgeUpdate\Clients\{65C35B14-6C1D-4122-AC46-7148CC9D6497}"
        ]
        
        ; 检查所有可能的系统级别路径
        for regPath in regPaths {
            try {
                version := RegRead(regPath, "pv")
                if version
                    return version
            } catch Error {
                ; 忽略错误，继续检查下一个路径
                continue
            }
        }
        
        ; 检查所有可能的用户级别路径
        for regPath in userRegPaths {
            try {
                version := RegRead(regPath, "pv")
                if version
                    return version
            } catch Error {
                ; 忽略错误，继续检查下一个路径
                continue
            }
        }
        
        ; 如果上述都没找到，尝试检查默认安装路径
        defaultPaths := [
            A_ProgramFiles "\Microsoft\Edge\Application\msedgewebview2.exe",
            A_ProgramFiles "\Microsoft\EdgeWebView\Application\msedgewebview2.exe",
            A_AppData "\Local\Microsoft\Edge\Application\msedgewebview2.exe",
            A_AppData "\Local\Microsoft\EdgeWebView\Application\msedgewebview2.exe"
        ]
        
        for path in defaultPaths {
            if FileExist(path)
                return "Found" ; 如果找到文件，返回一个非空值
        }
        
        return ""
    }
    
    ; 导航到URL(静态方法)
    static NavigateToUrl(hwnd, url) {
        ; 模拟导航到URL
        ; 注意：这里只是简化的模拟实现
        ; 实际应用中需要使用COM接口与WebView2交互
        if WinExist("ahk_id " hwnd) {
            ; 使用临时文件实现显示HTML内容
            if SubStr(url, 1, 7) = "file://" {
                filePath := SubStr(url, 8)
                
                ; 检查文件是否存在
                if FileExist(filePath) {
                    ; 使用IE COM对象显示HTML内容(简化模拟)
                    return true
                }
            }
        }
        
        return false
    }
    
    ; 执行JavaScript(静态方法)
    static ExecuteJavaScript(hwnd, script) {
        ; 模拟执行JavaScript
        ; 注意：这里只是简化的模拟实现
        if WinExist("ahk_id " hwnd) {
            ; 在实际的WebView2中执行脚本
            return true
        }
        
        return false
    }
    
    ; 添加消息监听器(静态方法)
    static AddMessageListener(hwnd, channelName, allowedOrigins) {
        ; 模拟添加消息监听器
        if WinExist("ahk_id " hwnd) {
            ; 设置消息通道
            return true
        }
        
        return false
    }
}

; WebView2控件类定义
class WebView2Control {
    ; 存储WebView2实例
    WebView := ""
    static className := "WebView2ControlClass"
    Hwnd := 0
    Gui := ""
    
    ; 初始化
    __New(gui, options := "", text := "") {
        this.Gui := gui
        
        ; 创建控件，使用STATIC类作为基础窗口类
        if !InStr(options, "Class")
            options := "ClassStatic " options
            
        this.Hwnd := this.Gui.Add("Custom", options, text).Hwnd
        
        ; 创建WebView2实例
        this.WebView := WebView2(this)
        
        ; 返回this以支持方法链式调用
        return this
    }
    
    ; 导航方法
    Navigate(url) {
        if !this.WebView
            return false
        return this.WebView.Navigate(url)
    }
    
    ; 执行JavaScript
    ExecuteScript(script) {
        if !this.WebView
            return false
        return this.WebView.ExecuteScript(script)
    }
    
    ; 添加事件监听器
    addEventListener(eventName, callback) {
        if !this.WebView
            return false
        return this.WebView.addEventListener(eventName, callback)
    }
    
    ; CoreWebView2属性
    CoreWebView2 {
        get {
            if !this.WebView
                return ""
            return this.WebView.CoreWebView2
        }
    }
}

; 注册WebView2Control为GUI控件类型
AddWebView2(this, options := "", text := "") {
    ; 创建WebView2Control实例并返回
    return WebView2Control(this, options, text)
}

; 将AddWebView2方法添加到Gui原型
Gui.Prototype.DefineProp("AddWebView2", {Call: AddWebView2})

WindowProc(hwnd, msg, wParam, lParam) {
    static WM_DESTROY := 0x0002
    
    if (msg = WM_DESTROY) {
        ; 清理资源
        return 0
    }
    return DllCall("DefWindowProc", "ptr", hwnd, "uint", msg, "ptr", wParam, "ptr", lParam, "ptr")
}

; 定义消息处理函数
WM_APP_MESSAGE(wParam, lParam, msg, hwnd) {
    return 0
}

; 自定义Gui控件 - WebView2 - 旧代码移除
; Gui.Prototype.AddWebView2 := Gui.Prototype.Add.Bind(Gui.Prototype, "Custom", , "ClassWebView2")

; 旧的WebView2控件类定义移除
; Class ClassWebView2 {...} 