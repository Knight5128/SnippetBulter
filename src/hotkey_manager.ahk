#Requires AutoHotkey v2.0
; 热键管理模块 - 负责注册和管理全局热键

; 存储所有已注册的热键
global registeredHotkeys := Map()

; ==================== 热键管理函数 ====================

; 注册全局热键
RegisterHotkey(hotkeyString, callbackFunc) {
    try {
        ; 如果已经注册过相同的热键，先取消
        if registeredHotkeys.Has(hotkeyString) {
            Hotkey hotkeyString, "Off"
        }
        
        ; 注册新热键
        Hotkey hotkeyString, callbackFunc
        registeredHotkeys[hotkeyString] := callbackFunc
        return true
    } catch Error as e {
        MsgBox("注册热键失败: " hotkeyString "`n错误: " e.Message, "错误", "Icon!")
        return false
    }
}

; 注销指定热键
UnregisterHotkey(hotkeyString) {
    try {
        if registeredHotkeys.Has(hotkeyString) {
            Hotkey hotkeyString, "Off"
            registeredHotkeys.Delete(hotkeyString)
        }
        return true
    } catch Error as e {
        return false
    }
}

; 更新热键
UpdateHotkey(oldHotkeyString, newHotkeyString, callbackFunc) {
    ; 先注销旧热键
    UnregisterHotkey(oldHotkeyString)
    
    ; 然后注册新热键
    return RegisterHotkey(newHotkeyString, callbackFunc)
} 