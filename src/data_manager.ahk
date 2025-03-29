#Requires AutoHotkey v2.0
; 数据管理模块 - 负责处理片段和设置的读写操作

; 全局变量引用
global snippetsData := Map()  ; 存储所有片段数据
global settings := Map(
    "hotkey", "^+Space",      ; 默认快捷键: Ctrl+Shift+Space
    "autoHide", false,        ; 选择后自动隐藏窗口
    "alwaysOnTop", true       ; 窗口保持在最前
)

; 文件路径
dataFolder := A_ScriptDir "\data"
if !DirExist(dataFolder)
    DirCreate(dataFolder)
    
snippetsFile := dataFolder "\snippets.json"
settingsFile := dataFolder "\settings.json"

; ==================== 数据操作函数 ====================

; 加载片段数据
LoadSnippets() {
    try {
        if FileExist(snippetsFile) {
            fileContent := FileRead(snippetsFile)
            if fileContent {
                loadedData := Jxon_Load(&fileContent)
                ; 将加载的数据转换为Map形式
                for groupName, group in loadedData {
                    snippetsData[groupName] := Map()
                    if IsObject(group) {
                        for snippetName, snippetContent in group {
                            snippetsData[groupName][snippetName] := snippetContent
                        }
                    }
                }
            }
        } else {
            ; 如果文件不存在，创建默认结构
            CreateDefaultSnippets()
            SaveSnippets()
        }
    } catch Error as e {
        MsgBox("加载片段数据时出错: " e.Message, "错误", "Icon!")
        ; 初始化为空结构
        snippetsData := Map()
        
        ; 尝试创建默认片段
        try {
            CreateDefaultSnippets()
        } catch {
            ; 如果创建默认片段失败，至少创建一个空分组
            snippetsData["常用"] := Map()
        }
    }
}

; 创建默认片段数据
CreateDefaultSnippets() {
    ; 清空当前数据并创建基本结构
    global snippetsData := Map()
    
    ; 添加常用分组
    snippetsData["常用"] := Map()
    snippetsData["常用"]["问候语"] := "您好，感谢您的来信。"
    snippetsData["常用"]["签名"] := "此致,`n敬礼`n张三"
    
    ; 添加代码分组
    snippetsData["代码"] := Map()
    snippetsData["代码"]["HTML模板"] := "HTML网页模板示例"
    snippetsData["代码"]["AHK函数"] := "AutoHotkey函数示例"
}

; 保存片段数据
SaveSnippets() {
    try {
        ; 将数据转换为JSON并写入文件
        jsonStr := Jxon_Dump(snippetsData, 4)
        file := FileOpen(snippetsFile, "w", "UTF-8")
        file.Write(jsonStr)
        file.Close()
        
        ToolTip("片段数据已保存!")
        SetTimer () => ToolTip(), -2000
        return true
    } catch Error as e {
        MsgBox("保存片段数据时出错: " e.Message, "错误", "Icon!")
        return false
    }
}

; 加载设置
LoadSettings() {
    try {
        if FileExist(settingsFile) {
            fileContent := FileRead(settingsFile)
            if fileContent {
                loadedSettings := Jxon_Load(&fileContent)
                for key, value in loadedSettings {
                    settings[key] := value
                }
            }
        } else {
            ; 如果文件不存在，使用默认设置并保存
            SaveSettingsToFile()
        }
    } catch Error as e {
        MsgBox("加载设置时出错: " e.Message, "错误", "Icon!")
    }
}

; 保存设置到文件
SaveSettingsToFile() {
    try {
        ; 确保所有需要保存的设置都已赋值
        if !settings.Has("hotkey")
            settings["hotkey"] := "^+Space"
        if !settings.Has("autoHide")
            settings["autoHide"] := false
        if !settings.Has("alwaysOnTop")
            settings["alwaysOnTop"] := true
            
        ; 将设置转换为JSON并写入文件
        jsonStr := Jxon_Dump(settings, 4)
        file := FileOpen(settingsFile, "w", "UTF-8")
        file.Write(jsonStr)
        file.Close()
        return true
    } catch Error as e {
        MsgBox("保存设置时出错: " e.Message, "错误", "Icon!")
        return false
    }
}

; 重新加载所有数据
ReloadAllData() {
    LoadSettings()
    LoadSnippets()
    return true
}

; ==================== 工具函数 ====================

; 添加新片段
AddSnippet(groupName, snippetName, snippetContent) {
    if !snippetsData.Has(groupName)
        snippetsData[groupName] := Map()
        
    snippetsData[groupName][snippetName] := snippetContent
    return SaveSnippets()
}

; 删除片段
DeleteSnippet(groupName, snippetName) {
    if snippetsData.Has(groupName) && snippetsData[groupName].Has(snippetName) {
        snippetsData[groupName].Delete(snippetName)
        return SaveSnippets()
    }
    return false
}

; 添加分组
AddGroup(groupName) {
    if !snippetsData.Has(groupName) {
        snippetsData[groupName] := Map()
        return SaveSnippets()
    }
    return false
}

; 删除分组
DeleteGroup(groupName) {
    if snippetsData.Has(groupName) {
        snippetsData.Delete(groupName)
        return SaveSnippets()
    }
    return false
}

; 重命名分组
RenameGroup(oldName, newName) {
    if snippetsData.Has(oldName) && !snippetsData.Has(newName) {
        snippetsData[newName] := snippetsData[oldName]
        snippetsData.Delete(oldName)
        return SaveSnippets()
    }
    return false
} 