#Requires AutoHotkey v2.0
; WebView2控件库 - 简化版，用于与WebView2进行交互

; 检查WebView2运行时是否已安装
WebView2_IsInstalled() {
    try {
        key := "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
        version := RegRead(key, "pv")
        return version
    } catch {
        try {
            key := "HKEY_CURRENT_USER\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
            version := RegRead(key, "pv")
            return version
        } catch {
            return ""
        }
    }
}

; WebView2类
class WebView2 {
    static _instance := false
    static _initialized := false
    
    ; 获取已安装的WebView2版本
    static GetInstalledVersion() {
        return WebView2_IsInstalled()
    }
    
    ; 创建WebView2控件
    static Create(guiObj, options := "w640 h480") {
        ; 如果未初始化COM，则进行初始化
        if (!WebView2._initialized) {
            WebView2._InitCOM()
        }
        
        ; 创建基础控件
        webView := guiObj.Add("ActiveX", options . " vWV2", "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}")
        
        ; 初始化WebView2
        WebView2._InitWebView(webView)
        
        return webView
    }
    
    ; 初始化COM
    static _InitCOM() {
        ComObject("{BD93C9D2-9A92-41C3-9C71-A2CCB953AD0D}")
        WebView2._initialized := true
    }
    
    ; 初始化WebView2控件
    static _InitWebView(webView) {
        ; 设置WebView2属性和方法
        webView.Navigate := (url) => webView.CoreWebView2.Navigate(url)
        webView.ExecuteScript := (script) => webView.CoreWebView2.ExecuteScript(script)
        webView.AddEventListener := (eventName, callback) => {
            webView.CoreWebView2.AddEventListener(eventName, callback)
        }
        
        ; 添加其他必要的属性
        webView.CoreWebView2 := ComObject("{BD93C9D2-9A92-41C3-9C71-A2CCB953AD0D}")
        
        return webView
    }
}

; 注册Gui控件类型
Gui.Prototype.AddWebView2 := (options) => WebView2.Create(this, options) 