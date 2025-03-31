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
        if !IsWebView2Installed() {
            errorMsg := "未检测到WebView2运行时。`n`n"
            errorMsg .= "WebView2是显示现代Web界面所必需的组件。`n"
            
            ; 检查是否有打包的WebView2运行时
            if FileExist(A_ScriptDir "\resources\MicrosoftEdgeWebview2Setup.exe") {
                errorMsg .= "检测到应用包含WebView2引导安装程序。`n是否立即安装？"
                
                if MsgBox(errorMsg, "WebView2运行时检查", "YesNo Icon!") = "Yes" {
                    ToolTip("正在从应用包安装WebView2运行时...")
                    RunWait(A_ScriptDir "\resources\MicrosoftEdgeWebview2Setup.exe /silent /install", , "Hide")
                    
                    ToolTip("安装完成，正在检查...")
                    Sleep(2000)
                    ToolTip()
                    
                    ; 检查安装是否成功
                    if IsWebView2Installed() {
                        MsgBox("WebView2运行时安装成功！", "安装成功", "Icon!")
                    } else {
                        MsgBox("WebView2运行时似乎未能正确安装。请手动安装或重启程序后再试。", "安装可能失败", "Icon!")
                        return false
                    }
                } else {
                    MsgBox("没有WebView2运行时，程序可能无法正常工作。", "警告", "Icon!")
                    return false
                }
            } else {
                ; 使用在线安装方式
                errorMsg .= "是否自动下载并安装WebView2运行时？"
                
                if MsgBox(errorMsg, "WebView2运行时检查", "YesNo Icon!") = "Yes" {
                    ; 尝试自动安装WebView2运行时
                    if !InstallWebView2Runtime() {
                        MsgBox("WebView2运行时安装失败，程序可能无法正常工作。", "安装失败", "Icon!")
                        return false
                    }
                    
                    ; 安装成功后再次检查
                    if !IsWebView2Installed() {
                        MsgBox("WebView2运行时似乎已安装，但系统尚未正确识别。`n请重启应用程序后再试。", "需要重启", "Icon!")
                        return false
                    }
                    
                    MsgBox("WebView2运行时安装成功！", "安装成功", "Icon!")
                } else {
                    MsgBox("没有WebView2运行时，程序可能无法正常工作。`n您可以稍后从托盘菜单中选择安装。", "警告", "Icon!")
                    return false
                }
            }
        }
        
        ; 定义用户数据目录
        userDataDir := A_AppData "\SnippetButler\WebView2Data"
        DirCreate(userDataDir)
        
        ; 输出调试信息
        ToolTip("正在初始化WebView2...`n用户数据目录：" userDataDir)
        SetTimer () => ToolTip(), -2000

        ; 加载 WebView2Loader.dll
        dllPath := A_ScriptDir "\WebView2Loader.dll"
        if !FileExist(dllPath) {
            ; 尝试多个可能的路径
            possiblePaths := [
                A_ScriptDir "\WebView2Loader.dll",
                A_ScriptDir "\src\lib\WebView2Loader.dll",
                A_WinDir "\System32\WebView2Loader.dll",
                A_WinDir "\SysWOW64\WebView2Loader.dll",
                "WebView2Loader.dll"  ; 系统路径搜索
            ]
            
            dllPath := ""
            for path in possiblePaths {
                if FileExist(path) {
                    dllPath := path
                    break
                }
            }
            
            if !dllPath {
                errorMsg := "未找到 WebView2Loader.dll，请确保：`n"
                errorMsg .= "1. WebView2运行时已安装`n"
                errorMsg .= "2. WebView2Loader.dll 位于脚本目录或系统路径`n"
                errorMsg .= "3. 已以管理员权限运行此程序`n`n"
                errorMsg .= "是否下载并安装 WebView2 运行时？"
                
                if MsgBox(errorMsg, "找不到 WebView2Loader.dll", "YesNo Icon!") = "Yes" {
                    Run("https://developer.microsoft.com/microsoft-edge/webview2/")
                }
                return false
            }
        }
        
        hModule := DllCall("LoadLibrary", "Str", dllPath, "Ptr")
        if !hModule {
            errorCode := A_LastError
            errorMsg := "加载 WebView2Loader.dll 失败。`n"
            errorMsg .= "错误代码: " errorCode "`n"
            errorMsg .= "请确保WebView2Loader.dll位于正确位置`n"
            errorMsg .= "尝试的路径: " dllPath
            MsgBox(errorMsg, "错误", "Icon!")
            return false
        }

        ; 获取函数地址
        CreateCoreWebView2Environment := DllCall("GetProcAddress", "Ptr", hModule, 
            "AStr", "CreateCoreWebView2Environment", "Ptr")
        if !CreateCoreWebView2Environment {
            errorCode := A_LastError
            MsgBox("获取 CreateCoreWebView2Environment 函数失败。`n错误代码: " errorCode, "错误", "Icon!")
            DllCall("FreeLibrary", "Ptr", hModule)
            return false
        }

        ; 转换用户数据目录为 UTF-16 指针
        userDataDirPtr := Buffer(StrPut(userDataDir, "UTF-16") * 2)
        StrPut(userDataDir, userDataDirPtr, "UTF-16")
        
        ; 确认指针有效
        if (!userDataDirPtr || !userDataDirPtr.Ptr) {
            MsgBox("创建用户数据目录指针失败", "错误", "Icon!")
            DllCall("FreeLibrary", "Ptr", hModule)
            return false
        }

        ; 定义异步回调
        handler := CallbackCreate(EnvironmentCreatedHandler, "Fast")
        if (!handler) {
            MsgBox("创建回调函数失败", "错误", "Icon!")
            DllCall("FreeLibrary", "Ptr", hModule)
            return false
        }

        ; 记录参数信息用于调试
        debugInfo := "调用参数信息：`n"
        debugInfo .= "browserExecutableFolder: NULL (使用默认)`n"
        debugInfo .= "userDataFolder: " userDataDir "`n"
        debugInfo .= "userDataFolderPtr: " Format("0x{:p}", userDataDirPtr.Ptr) "`n"
        debugInfo .= "handler: " Format("0x{:p}", handler)
        OutputDebug(debugInfo)

        ; 调用 CreateCoreWebView2Environment
        hr := DllCall(CreateCoreWebView2Environment,
            "Ptr", 0,                  ; browserExecutableFolder
            "Ptr", userDataDirPtr.Ptr, ; userDataFolder
            "Ptr", 0,                  ; environmentOptions
            "Ptr", handler,            ; 回调函数
            "UInt")

        if (hr != 0) {
            ; 解析错误代码
            errorMsg := "创建WebView2环境失败。`n"
            errorMsg .= "错误代码: " Format("0x{:08X}", hr) " "
            
            ; 常见错误代码解析
            switch hr {
                case 0x80004003: errorMsg .= "(E_POINTER) - 无效指针，userDataDir或handler参数可能有问题"
                case 0x80070057: errorMsg .= "(E_INVALIDARG) - 无效参数，检查参数类型和值"
                case 0x80070002: errorMsg .= "(ERROR_FILE_NOT_FOUND) - 找不到文件，WebView2运行时可能未安装"
                case 0x8007007E: errorMsg .= "(ERROR_MOD_NOT_FOUND) - 找不到模块，WebView2运行时可能未正确安装"
                case 0x80070005: errorMsg .= "(E_ACCESSDENIED) - 访问被拒绝，检查文件夹权限"
                default: errorMsg .= "(未知错误) - 请确保WebView2运行时已正确安装"
            }
            
            errorMsg .= "`n`n可能的解决方案:`n"
            errorMsg .= "1. 安装/重新安装WebView2运行时`n"
            errorMsg .= "2. 确保应用有足够的权限`n"
            errorMsg .= "3. 检查" userDataDir "目录权限"
            
            MsgBox(errorMsg, "错误", "Icon!")
            
            CallbackFree(handler)
            DllCall("FreeLibrary", "Ptr", hModule)
            return false
        }

        ; 保存全局引用以防止过早释放
        global g_hModule := hModule
        global g_handler := handler
        global g_userDataDirPtr := userDataDirPtr
        
        return true
    } catch Error as e {
        MsgBox("初始化 WebView2 时发生异常：`n" e.Message "`n" e.Extra "`n" e.Stack, "错误", "Icon!")
        return false
    }
}

; 检查WebView2运行时是否已安装
IsWebView2Installed() {
    ; 方法1: 检查注册表
    ; 检查注册表中WebView2运行时的安装状态
    isInstalled := false
    
    ; 定义待检查的注册表路径
    regPaths := [
        ; HKLM路径 (适用于系统级安装)
        "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        
        ; HKCU路径 (适用于用户级安装)
        "HKEY_CURRENT_USER\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    ]
    
    ; 获取当前系统位数对应的注册表视图
    regView := A_Is64bitOS ? "64" : "32"
    
    For _, regPath in regPaths {
        OutputDebug("检查注册表路径: " regPath)
        
        Try {
            ; 检查注册表路径是否存在
            Loop Reg, regPath, regView {
                ; 检查pv (版本)值
                Try {
                    version := RegRead(regPath, "pv")
                    OutputDebug("找到WebView2版本: " version)
                    
                    ; 判断版本是否有效
                    if (version != "" && version != "null" && version != "0.0.0.0") {
                        isInstalled := true
                        break
                    }
                } Catch {
                    ; 如果无法读取pv值，继续检查下一个
                    OutputDebug("无法读取版本信息")
                }
                
                ; 如果找到路径但没有跳出循环，表示可能版本值无效
                isInstalled := false
                break
            }
            
            ; 如果已确认安装，跳出外层循环
            if (isInstalled)
                break
        } Catch {
            ; 如果无法访问此注册表路径，继续检查下一个
            OutputDebug("无法访问注册表路径: " regPath)
        }
    }
    
    ; 如果在注册表中找到了有效安装，直接返回
    if (isInstalled) {
        OutputDebug("通过注册表确认WebView2已安装")
        return true
    }
    
    ; 方法2: 检查典型的WebView2运行时文件
    filePaths := [
        A_WinDir "\System32\msedgewebview2.exe",
        A_WinDir "\SysWOW64\msedgewebview2.exe"
    ]
    
    For _, filePath in filePaths {
        if FileExist(filePath) {
            OutputDebug("找到WebView2文件: " filePath)
            return true
        }
    }
    
    ; 方法3: 尝试创建WebView2环境对象
    Try {
        comObj := ComObject("{2CD8A007-E189-409D-A2C8-9AF4EF3C72AA}", "{EF6F1F1E-9EB4-4F8F-9472-E8F7861E1F25}")
        OutputDebug("成功创建WebView2 COM对象")
        return true
    } Catch Error as e {
        OutputDebug("创建WebView2 COM对象失败: " e.Message)
    }
    
    ; 所有检测方法都失败，返回未安装
    OutputDebug("未检测到WebView2运行时")
    return false
}

; 安装WebView2运行时
InstallWebView2Runtime() {
    ; 定义安装目录
    installDir := A_ScriptDir "\Runtime"
    if !DirExist(installDir)
        DirCreate(installDir)
    
    ; 引导安装方式
    bootstrapperPath := installDir "\MicrosoftEdgeWebview2Setup.exe"
    
    ; 检查是否已下载引导程序
    if !FileExist(bootstrapperPath) {
        ; 尝试从资源目录复制
        if FileExist(A_ScriptDir "\resources\MicrosoftEdgeWebview2Setup.exe") {
            FileCopy(A_ScriptDir "\resources\MicrosoftEdgeWebview2Setup.exe", bootstrapperPath)
        } else {
            ; 下载引导程序
            try {
                ToolTip("正在下载WebView2引导安装程序...")
                Download("https://go.microsoft.com/fwlink/p/?LinkId=2124703", bootstrapperPath)
                ToolTip("下载完成！")
                SetTimer () => ToolTip(), -2000
            } catch Error as e {
                ToolTip()
                MsgBox("下载WebView2引导安装程序失败: " e.Message, "下载错误", "Icon!")
                
                ; 提供其他下载选项
                if MsgBox("是否打开浏览器下载WebView2运行时？", "下载选项", "YesNo Icon!") = "Yes"
                    Run("https://developer.microsoft.com/microsoft-edge/webview2/")
                    
                return false
            }
        }
    }
    
    ; 执行引导安装程序
    if FileExist(bootstrapperPath) {
        try {
            ToolTip("正在安装WebView2运行时...")
            ; 使用/silent参数静默安装
            RunWait(bootstrapperPath " /silent /install", , "Hide")
            ToolTip("WebView2运行时安装完成！")
            SetTimer () => ToolTip(), -2000
            return true
        } catch Error as e {
            ToolTip()
            MsgBox("安装WebView2运行时失败: " e.Message, "安装错误", "Icon!")
            return false
        }
    } else {
        MsgBox("未找到WebView2引导安装程序。", "安装错误", "Icon!")
        return false
    }
    
    return false
}

; 定义回调函数
EnvironmentCreatedHandler(hr, env) {
    if (hr != 0) {
        ; 解析错误代码
        errorMsg := "WebView2 环境创建失败。`n"
        errorMsg .= "错误代码: " Format("0x{:08X}", hr) " "
        
        switch hr {
            case 0x80004003: errorMsg .= "(E_POINTER) - 无效指针"
            case 0x80070057: errorMsg .= "(E_INVALIDARG) - 无效参数"
            case 0x80070002: errorMsg .= "(ERROR_FILE_NOT_FOUND) - 找不到文件"
            case 0x8007007E: errorMsg .= "(ERROR_MOD_NOT_FOUND) - 找不到模块"
            case 0x80070005: errorMsg .= "(E_ACCESSDENIED) - 访问被拒绝"
            default: errorMsg .= "(未知错误)"
        }
        
        MsgBox(errorMsg, "错误", "Icon!")
        CallbackFree(A_EventInfo)  ; 释放回调
        return
    }

    ; 成功获取 env 后的操作
    global webview2Env := env  ; 保存环境引用
    
    ; 输出调试信息
    ToolTip("WebView2 环境创建成功！")
    SetTimer () => ToolTip(), -2000
    
    ; 输出详细信息到调试窗口
    OutputDebug("WebView2 环境创建成功，env指针: " Format("0x{:p}", env))
    
    ; 可以在这里初始化其他WebView2相关组件
    
    ; 注意：不要在此释放资源，因为我们需要保持环境引用
    ; CallbackFree 和 FreeLibrary 由应用关闭时处理
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
        hr := DllCall(CreateCoreWebView2Environment, "Ptr", 0, "Ptr", selectorWindow.Hwnd, "Ptr*", &controller := 0)
        if (hr != 0) {
            MsgBox("创建 WebView2 环境失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 创建 WebView2 控件
        hr := DllCall(controller.vt[6], "Ptr", controller, "Ptr", selectorWindow.Hwnd, "Ptr*", &webview := 0)
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
        selectorWindow.env := controller
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
        hr := DllCall(CreateCoreWebView2Environment, "Ptr", 0, "Ptr", managerWindow.Hwnd, "Ptr*", &controller := 0)
        if (hr != 0) {
            MsgBox("创建 WebView2 环境失败。错误代码: " Format("0x{:08X}", hr), "错误", "Icon!")
            return
        }
        
        ; 创建 WebView2 控件
        hr := DllCall(controller.vt[6], "Ptr", controller, "Ptr", managerWindow.Hwnd, "Ptr*", &webview := 0)
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
        managerWindow.env := controller
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

; 注册WebView2组件（需要管理员权限）
RegisterWebView2Components() {
    if !A_IsAdmin {
        MsgBox("注册组件需要管理员权限，请以管理员身份运行本程序。", "权限不足", "Icon!")
        return false
    }
    
    ; 尝试注册WebView2Loader.dll
    dllPath := ""
    possiblePaths := [
        A_ScriptDir "\WebView2Loader.dll",
        A_ScriptDir "\src\lib\WebView2Loader.dll",
        A_WinDir "\System32\WebView2Loader.dll",
        A_WinDir "\SysWOW64\WebView2Loader.dll"
    ]
    
    for path in possiblePaths {
        if FileExist(path) {
            dllPath := path
            break
        }
    }
    
    if !dllPath {
        MsgBox("找不到WebView2Loader.dll，无法注册组件。", "错误", "Icon!")
        return false
    }
    
    ; 使用regsvr32注册DLL
    RunWait(A_ComSpec ' /c regsvr32 /s "' dllPath '"', , "Hide")
    
    ; 检查是否注册成功
    if A_LastError {
        MsgBox("注册组件失败，错误代码: " A_LastError, "错误", "Icon!")
        return false
    }
    
    MsgBox("WebView2组件注册成功！", "成功", "Icon!")
    return true
} 