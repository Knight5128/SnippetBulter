#Requires AutoHotkey v2.0
; 脚本集成模块 - 用于管理和集成外部AutoHotkey脚本

; 存储已加载的脚本实例
global loadedScripts := Map()

; 脚本路径映射
scriptsPaths := Map(
    "easy-window-dragging", A_ScriptDir "\integrated_scripts\easy-window-dragging.ahk", 
    "on-screen-keyboard", A_ScriptDir "\integrated_scripts\on-screen-keyboard.ahk"
)

; ==================== 脚本集成函数 ====================

; 加载外部脚本
LoadScript(scriptName) {
    if !scriptsPaths.Has(scriptName)
        return false
        
    scriptPath := scriptsPaths[scriptName]
    
    if !FileExist(scriptPath)
        return false
    
    try {
        ; 使用Run方法加载脚本
        Run "`"" A_AhkPath "`" `"" scriptPath "`""
        loadedScripts[scriptName] := true
        return true
    } catch Error as e {
        MsgBox("加载脚本失败: " scriptName "`n错误: " e.Message, "错误", "Icon!")
        return false
    }
}

; 卸载外部脚本
UnloadScript(scriptName) {
    if !loadedScripts.Has(scriptName)
        return false
        
    scriptPath := scriptsPaths[scriptName]
    scriptPID := GetScriptPID(scriptPath)
    
    if scriptPID {
        try {
            ; 通过PID关闭脚本
            ProcessClose(scriptPID)
            loadedScripts.Delete(scriptName)
            return true
        } catch {
            return false
        }
    }
    
    return false
}

; 获取已加载脚本的PID
GetScriptPID(scriptPath) {
    ; 获取脚本文件名
    SplitPath scriptPath, &scriptFileName
    
    ; 查找运行中的脚本进程
    for process in ComObjGet("winmgmts:").ExecQuery("Select * from Win32_Process where Name = 'AutoHotkey.exe' OR Name = 'AutoHotkeyU64.exe' OR Name = 'AutoHotkeyU32.exe'") {
        try {
            ; 获取命令行参数
            cmdLine := process.CommandLine
            
            ; 检查是否包含目标脚本路径
            if InStr(cmdLine, scriptFileName)
                return process.ProcessId
        } catch {
            continue
        }
    }
    
    return 0
}

; 检查脚本是否已加载
IsScriptLoaded(scriptName) {
    return loadedScripts.Has(scriptName)
}

; 切换脚本加载状态
ToggleScript(scriptName) {
    if IsScriptLoaded(scriptName)
        return UnloadScript(scriptName)
    else
        return LoadScript(scriptName)
}

; 初始化集成脚本
InitIntegratedScripts() {
    ; 确保脚本目录存在
    scriptsDir := A_ScriptDir "\integrated_scripts"
    if !DirExist(scriptsDir)
        DirCreate(scriptsDir)
        
    ; 创建默认脚本示例
    CreateDefaultScripts()
}

; 创建默认脚本示例
CreateDefaultScripts() {
    ; 创建Easy Window Dragging脚本示例
    easyDragPath := scriptsPaths["easy-window-dragging"]
    if !FileExist(easyDragPath) {
        easyDragScript := "
        (
#Requires AutoHotkey v2.0
; Easy Window Dragging - 窗口拖动脚本示例
; 按住Alt键并用鼠标左键拖动任意窗口

; 设置Alt+鼠标左键拖动窗口
!LButton::
{
    ; 获取鼠标下的窗口
    MouseGetPos ,, &winId
    
    ; 如果没有窗口或是桌面，则退出
    if !winId
        return
    
    ; 保存初始窗口状态
    WinGetPos &winX, &winY,,, winId
    
    ; 获取初始鼠标位置
    MouseGetPos &mouseX, &mouseY
    
    ; 计算偏移量
    offsetX := mouseX - winX
    offsetY := mouseY - winY
    
    ; 设置鼠标捕获
    SetCapture(winId)
    
    ; 循环处理拖动
    while GetKeyState('LButton', 'P')
    {
        ; 获取当前鼠标位置
        MouseGetPos &curMouseX, &curMouseY
        
        ; 计算新窗口位置
        newWinX := curMouseX - offsetX
        newWinY := curMouseY - offsetY
        
        ; 移动窗口
        WinMove newWinX, newWinY,,, winId
        
        ; 短暂休眠以降低CPU使用
        Sleep 10
    }
    
    ; 释放鼠标捕获
    ReleaseCapture()
    return
}

; === 辅助函数 ===
SetCapture(hwnd) {
    DllCall('SetCapture', 'Ptr', hwnd)
}

ReleaseCapture() {
    DllCall('ReleaseCapture')
}
        )"
        
        FileAppend(easyDragScript, easyDragPath)
    }
    
    ; 创建On-Screen Keyboard脚本示例
    keyboardPath := scriptsPaths["on-screen-keyboard"]
    if !FileExist(keyboardPath) {
        keyboardScript := "
        (
#Requires AutoHotkey v2.0
; On-Screen Keyboard - 屏幕键盘脚本示例
; 按Win+K显示/隐藏屏幕键盘

; 全局变量
global keyboardGui := {}
global isVisible := false

; 注册热键Win+K
#k::ToggleKeyboard()

; 切换键盘显示状态
ToggleKeyboard() {
    global isVisible
    
    if isVisible {
        keyboardGui.Hide()
        isVisible := false
    } else {
        ShowKeyboard()
        isVisible := true
    }
}

; 显示屏幕键盘
ShowKeyboard() {
    global keyboardGui
    
    ; 创建GUI
    keyboardGui := Gui('+AlwaysOnTop -Caption +ToolWindow')
    keyboardGui.Title := '屏幕键盘'
    keyboardGui.BackColor := '222222'
    
    ; 定义键盘布局
    rows := [
        ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
        ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
        ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
        ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
        ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Menu', 'Ctrl', '←', '↑', '↓', '→']
    ]
    
    ; 设置按键尺寸和间距
    keyW := 40
    keyH := 40
    margin := 5
    
    ; 创建界面元素
    ; 添加关闭按钮
    keyboardGui.Add('Button', 'x' . (rows[1].Length * (keyW + margin) - 20) . ' y5 w20 h20', 'X')
        .OnEvent('Click', (*) => ToggleKeyboard())
    
    ; 逐行添加按键
    y := 30
    for row in rows {
        x := margin
        for key in row {
            ; 调整特殊键的宽度
            w := keyW
            if key = 'Space'
                w := keyW * 5
            else if key = 'Backspace' || key = 'Enter'
                w := keyW * 1.5
            else if key = 'Shift' || key = 'Caps' || key = 'Tab'
                w := keyW * 1.25
                
            ; 添加按钮
            keyboardGui.Add('Button', 'x' . x . ' y' . y . ' w' . w . ' h' . keyH, key)
                .OnEvent('Click', SendKey.Bind(key))
                
            ; 更新下一个按键位置
            x += w + margin
        }
        y += keyH + margin
    }
    
    ; 显示键盘并居中
    keyboardGui.Show('w' . (rows[1].Length * (keyW + margin)) . ' h' . (y + margin))
    CenterWindow(keyboardGui)
}

; 发送按键
SendKey(key, *) {
    ; 处理特殊键
    switch key {
        case 'Space': key := ' '
        case 'Backspace': key := '{Backspace}'
        case 'Enter': key := '{Enter}'
        case 'Esc': key := '{Escape}'
        case 'Tab': key := '{Tab}'
        case 'Caps': key := '{CapsLock}'
        case 'Shift': key := '{Shift}'
        case 'Ctrl': key := '{Ctrl}'
        case 'Alt': key := '{Alt}'
        case 'Win': key := '{LWin}'
        case 'Menu': key := '{AppsKey}'
        case '←': key := '{Left}'
        case '↑': key := '{Up}'
        case '↓': key := '{Down}'
        case '→': key := '{Right}'
    }
    
    ; 发送按键
    Send(key)
}

; 窗口居中函数
CenterWindow(guiObj) {
    guiObj.GetPos(&x, &y, &width, &height)
    guiObj.Move((A_ScreenWidth - width) / 2, (A_ScreenHeight - height) / 2)
}
        )"
        
        FileAppend(keyboardScript, keyboardPath)
    }
}

; 加载指定的集成脚本
LoadIntegratedScript(scriptName) {
    If !scriptsPaths.Has(scriptName)
        return false
        
    return LoadScript(scriptName)
}

; 卸载指定的集成脚本
UnloadIntegratedScript(scriptName) {
    If !scriptsPaths.Has(scriptName) || !loadedScripts.Has(scriptName)
        return false
        
    return UnloadScript(scriptName)
} 