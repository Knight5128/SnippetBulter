#Requires AutoHotkey v2.0

; =================================================================
; 文本片段管理器 (Text Snippet Manager)
; 版本: 1.0
; 作者: AutoHotkey开发者
; 描述: 一个高效管理和快速使用文本片段的桌面工具
; =================================================================

; -------------------- 模块引入 --------------------
; 包含JSON处理库
#Include %A_ScriptDir%\src\lib\Jxon.ahk

; 包含功能模块
#Include %A_ScriptDir%\src\data_manager.ahk
#Include %A_ScriptDir%\src\hotkey_manager.ahk
#Include %A_ScriptDir%\src\ui_handler.ahk
#Include %A_ScriptDir%\src\script_integrator.ahk

; -------------------- 应用初始化 --------------------
; 初始化应用
InitApp()

; 创建托盘图标
SetupTrayIcon()

; 注册默认热键
InitHotkeys()

; 应用已准备就绪
ToolTip("文本片段管理器已启动!")
SetTimer () => ToolTip(), -2000

; -------------------- 主要函数 --------------------
; 初始化应用
InitApp() {
    ; 设置脚本为单例模式
    if CheckIfAlreadyRunning() {
        MsgBox("文本片段管理器已在运行中!", "提示", "Icon!")
        ExitApp
    }
    
    ; 确保图标目录存在
    iconDir := A_ScriptDir "\icon"
    if !DirExist(iconDir)
        DirCreate(iconDir)
    
    ; 加载设置
    LoadSettings()
    
    ; 加载片段数据
    ReloadAllData()
    
    ; 初始化集成脚本
    InitIntegratedScripts()
    
    ; 初始化UI (WebView2)
    InitWebView2()
}

; 设置托盘图标
SetupTrayIcon() {
    ; 设置图标
    iconPath := A_ScriptDir "\icon\icon.png"
    if FileExist(iconPath) {
        try {
            TraySetIcon(iconPath)
        } catch {
            TraySetIcon("shell32.dll", 45)  ; 使用系统图标作为默认图标
        }
    } else {
        TraySetIcon("shell32.dll", 45)  ; 使用系统图标作为默认图标
    }
    
    ; 设置托盘菜单
    A_TrayMenu.Delete()  ; 清除默认菜单项
    A_TrayMenu.Add("打开管理面板", ShowManagerPanel)
    A_TrayMenu.Add("显示选择器", ShowSnippetSelector)
    A_TrayMenu.Add("重新加载数据", ReloadAllData)
    A_TrayMenu.Add()  ; 添加分隔符
    A_TrayMenu.Add("关于", ShowAbout)
    A_TrayMenu.Add("退出", (*) => ExitApp())
    A_TrayMenu.Default := "打开管理面板"
}

; 初始化热键
InitHotkeys() {
    ; 注册片段选择器热键
    RegisterHotkey(settings["hotkey"], ShowSnippetSelector)
}

; 显示关于对话框
ShowAbout(*) {
    MsgBox("文本片段管理器 v1.0`n`n一个高效管理和快速使用文本片段的桌面工具`n`n按" 
         . settings["hotkey"] . " 快速唤出选择器`n"
         . "从托盘图标打开管理面板可管理片段", "关于", "Icon!")
}

; 检查是否已有实例在运行
CheckIfAlreadyRunning() {
    static mutexName := "Text-Snippet-Manager-Mutex"
    static mutex := 0
    
    mutex := DllCall("CreateMutex", "Ptr", 0, "Int", false, "Str", mutexName)
    return (A_LastError == 183)  ; ERROR_ALREADY_EXISTS
}

; Text Snippet Manager - 文本片段管理器
; 功能：管理文本片段，通过全局快捷键快速选择和复制片段

; 全局变量
snippetsData := Map()  ; 存储所有片段数据
snippetsFile := A_ScriptDir "\snippets.json"  ; 片段数据文件
activeWindow := {}     ; 激活窗口引用

; 默认设置
settings := Map(
    "hotkey", "^+Space",      ; 默认快捷键: Ctrl+Shift+Space
    "autoHide", true,         ; 选择后自动隐藏窗口
    "alwaysOnTop", true       ; 窗口保持在最前
)
settingsFile := A_ScriptDir "\settings.json"  ; 设置文件

; 加载设置
LoadSettings()

; 加载保存的片段
ReloadAllData()

; 创建系统托盘图标 - 修复图标路径
iconPath := A_ScriptDir "\icon\icon.png"
try {
    TraySetIcon(iconPath)
} catch {
    ; 如果指定图标加载失败，使用系统图标作为默认图标
    TraySetIcon("shell32.dll", 45)
}

A_TrayMenu.Delete()  ; 清除默认菜单项
A_TrayMenu.Add("打开管理面板", ShowManagerPanel)
A_TrayMenu.Add("重新加载数据", ReloadAllData)
A_TrayMenu.Add("关于", ShowAbout)
A_TrayMenu.Add()  ; 添加分隔符
A_TrayMenu.Add("退出", (*) => ExitApp())
A_TrayMenu.Default := "打开管理面板"

; 注册全局热键
try {
    Hotkey settings["hotkey"], ShowSnippetSelector
} catch Error as e {
    MsgBox("无法注册热键: " settings["hotkey"] "`n错误: " e.Message, "错误", "Icon!")
}

; =============== 片段选择器窗口 ===============
/*
ShowSnippetSelector(*) {
    static selectorGui := Gui("+Resize +MinSize400x300")
    
    ; 清除现有控件
    selectorGui.Destroy()
    selectorGui := Gui("+Resize +MinSize400x300")
    
    ; 配置窗口属性
    selectorGui.Title := "选择文本片段"
    if settings["alwaysOnTop"]
        selectorGui.Opt("+AlwaysOnTop")
    
    ; 添加搜索框
    selectorGui.Add("Text", "x10 y10 w80 h25", "搜索片段:")
    searchBox := selectorGui.Add("Edit", "x90 y10 w300 h25")
    searchBox.OnEvent("Change", UpdateSnippetsList)
    
    ; 添加选择区域
    snippetsListView := selectorGui.Add("ListView", "x10 y45 w380 h245 Grid -Multi", ["名称", "内容"])
    snippetsListView.OnEvent("DoubleClick", SnippetSelected)
    
    ; 添加按键钩子
    selectorGui.OnEvent("Close", (*) => selectorGui.Hide())
    selectorGui.OnEvent("Escape", (*) => selectorGui.Hide())
    
    ; 添加提示文本
    selectorGui.Add("Text", "x10 y300 w380 h20", "提示: 双击复制片段，按Esc关闭窗口")
    
    ; 填充列表
    UpdateSnippetsList()
    
    ; 显示窗口
    selectorGui.Show("w400 h330")
    
    ; 内部函数: 更新片段列表
    UpdateSnippetsList(*) {
        snippetsListView.Delete()
        searchText := searchBox.Value
        
        ; 遍历所有片段和分组
        for groupName, group in snippetsData {
            ; 添加分组标题 (使用特殊标记以区分)
            if searchText = "" || InStr(groupName, searchText) {
                snippetsListView.Add("", "[分组] " groupName, "")
            }
            
            ; 添加该分组下的片段
            if IsObject(group) {
                for snippetName, snippetContent in group {
                    if searchText = "" || InStr(snippetName, searchText) || InStr(snippetContent, searchText) {
                        snippetsListView.Add("", "  " snippetName, snippetContent)
                    }
                }
            }
        }
        
        ; 自动调整列宽
        snippetsListView.ModifyCol(1, 150)
        snippetsListView.ModifyCol(2, "Auto")
    }
    
    ; 内部函数: 片段被选中
    SnippetSelected(snippetsListView, rowNumber) {
        rowText := snippetsListView.GetText(rowNumber, 1)
        
        ; 检查是否为分组标题
        if SubStr(rowText, 1, 8) = "[分组] " {
            return  ; 如果是分组标题，不执行任何操作
        }
        
        ; 获取片段内容
        snippetContent := snippetsListView.GetText(rowNumber, 2)
        
        ; 复制到剪贴板
        A_Clipboard := snippetContent
        
        ; 显示提示
        ToolTip("已复制: " SubStr(snippetContent, 1, 30) (StrLen(snippetContent) > 30 ? "..." : ""))
        SetTimer () => ToolTip(), -2000
        
        ; 注释掉自动隐藏部分，让用户手动按Esc退出
        ; if settings["autoHide"]
        ;     selectorGui.Hide()
    }
}
*/

; =============== 管理面板 ===============
/*
ShowManagerPanel(*) {
    static managerGui := Gui("+Resize +MinSize600x400")
    
    ; 清除现有控件
    managerGui.Destroy()
    managerGui := Gui("+Resize +MinSize600x400")
    
    ; 配置窗口属性
    managerGui.Title := "文本片段管理器 - 管理面板"
    managerGui.MarginX := 10
    managerGui.MarginY := 10
    
    ; 创建选项卡
    tabs := managerGui.Add("Tab3", "x10 y10 w580 h380", ["片段管理", "设置"])
    
    ; ===== 第一个标签页：片段管理 =====
    tabs.UseTab(1)
    
    ; 添加分组和片段列表
    managerGui.Add("Text", "x20 y40 w100 h20", "分组:")
    groupListBox := managerGui.Add("ListBox", "x20 y60 w160 h280 AltSubmit", [])
    groupListBox.OnEvent("Change", GroupSelected)
    
    managerGui.Add("Text", "x190 y40 w100 h20", "片段:")
    snippetListView := managerGui.Add("ListView", "x190 y60 w390 h280 Grid", ["名称", "内容"])
    snippetListView.OnEvent("DoubleClick", EditSnippet)
    
    ; 分组操作按钮
    managerGui.Add("Button", "x20 y350 w75 h25", "添加分组").OnEvent("Click", AddGroup)
    managerGui.Add("Button", "x105 y350 w75 h25", "重命名").OnEvent("Click", RenameGroup)
    managerGui.Add("Button", "x20 y380 w160 h25", "删除分组").OnEvent("Click", DeleteGroup)
    
    ; 片段操作按钮
    managerGui.Add("Button", "x190 y350 w75 h25", "添加片段").OnEvent("Click", AddSnippet)
    managerGui.Add("Button", "x275 y350 w75 h25", "编辑").OnEvent("Click", EditSnippet)
    managerGui.Add("Button", "x360 y350 w75 h25", "删除").OnEvent("Click", DeleteSnippet)
    managerGui.Add("Button", "x445 y350 w75 h25", "复制").OnEvent("Click", CopySnippet)
    managerGui.Add("Button", "x190 y380 w330 h25", "保存所有更改").OnEvent("Click", SaveSnippets)
    
    ; ===== 第二个标签页：设置 =====
    tabs.UseTab(2)
    
    ; 热键设置
    managerGui.Add("Text", "x20 y50 w120 h20", "全局热键:")
    hotkeyEdit := managerGui.Add("Hotkey", "x150 y50 w150 h20")
    hotkeyEdit.Value := settings["hotkey"]
    
    ; 其他设置（复选框）
    autoHideCheckbox := managerGui.Add("Checkbox", "x20 y90 w250 h20", "选择片段后自动隐藏窗口")
    autoHideCheckbox.Value := settings["autoHide"]
    
    alwaysOnTopCheckbox := managerGui.Add("Checkbox", "x20 y120 w250 h20", "片段选择器窗口始终置顶")
    alwaysOnTopCheckbox.Value := settings["alwaysOnTop"]
    
    ; 保存设置按钮
    managerGui.Add("Button", "x20 y380 w120 h25", "保存设置").OnEvent("Click", SaveSettings)
    
    ; 重新加载标签页
    tabs.UseTab()
    
    ; 填充分组列表
    RefreshGroupList()
    
    ; 显示窗口
    managerGui.Show("w600 h400")
*/

; =============== 数据管理函数 ===============

; 注意：以下函数已移至data_manager.ahk模块，这里删除以避免冲突
; 请使用data_manager.ahk中的函数

/*
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
    
    ; 使用简单字符串，避免任何可能导致解析问题的内容
    snippetsData["代码"]["HTML模板"] := "HTML网页模板示例"
    snippetsData["代码"]["AHK函数"] := "AutoHotkey函数示例"
}

; 保存片段数据
SaveSnippets(*) {
    try {
        ; 将数据转换为JSON并写入文件
        jsonStr := Jxon_Dump(snippetsData, 4)
        file := FileOpen(snippetsFile, "w", "UTF-8")
        file.Write(jsonStr)
        file.Close()
        
        ToolTip("片段数据已保存!")
    SetTimer () => ToolTip(), -2000
    } catch Error as e {
        MsgBox("保存片段数据时出错: " e.Message, "错误", "Icon!")
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
        ; 确保设置变量是全局变量
        global settings
        
        ; 确保所有需要保存的设置都已赋值
        if !settings.Has("hotkey")
            settings["hotkey"] := "^+Space"
        if !settings.Has("autoHide")
            settings["autoHide"] := true
        if !settings.Has("alwaysOnTop")
            settings["alwaysOnTop"] := true
            
        ; 将设置转换为JSON并写入文件
        jsonStr := Jxon_Dump(settings, 4)
        file := FileOpen(settingsFile, "w", "UTF-8")
        file.Write(jsonStr)
        file.Close()
    } catch Error as e {
        MsgBox("保存设置时出错: " e.Message, "错误", "Icon!")
    }
}

; 重新加载数据
ReloadData(*) {
    LoadSettings()
    LoadSnippets()
    MsgBox("数据已重新加载!", "成功", "Icon!")
}
*/

; =============== JXON 库函数 (JSON处理) ===============
; 来源: https://github.com/TheArkive/JXON_ahk2

Jxon_Load(&src, args*) {
    key := "", is_key := false
    stack := [ tree := [] ]
    next := '"{[01234567890-tfn'
    pos := 0
    
    while ((ch := SubStr(src, ++pos, 1)) != "") {
        if InStr(" `t`n`r", ch)
            continue
        if !InStr(next, ch, true) {
            testArr := StrSplit(SubStr(src, 1, pos), "`n")
            
            ln := testArr.Length
            col := pos - InStr(src, "`n",, -(StrLen(src)-pos+1))
            
            msg := Format("{}: line {} col {} (char {})"
            ,   (next == "") ? ["Extra data", ch := SubStr(src, pos)][1]
              : (next == "'") ? "Unterminated string starting at"
              : (next == "\") ? "Invalid \escape"
              : (next == ":") ? "Expecting ':' delimiter"
              : (next == '"') ? "Expecting object key enclosed in double quotes"
              : (next == '"}') ? "Expecting object key enclosed in double quotes or object closing '}'"
              : (next == ",}") ? "Expecting ',' delimiter or object closing '}'"
              : (next == ",]") ? "Expecting ',' delimiter or array closing ']'"
              : [ "Expecting JSON value(string, number, [true, false, null], object or array)"
                , ch := SubStr(src, pos, (SubStr(src, pos)~="[\]\},\s]|$")-1) ][1]
            , ln, col, pos)
            
            throw Error(msg, -1, ch)
        }
        
        obj := stack[1]
        is_array := (obj is Array)
        
        if i := InStr("{[", ch) { ; start new object / map?
            val := (i = 1) ? Map() : Array()
            
            is_array ? obj.Push(val) : obj[key] := val
            stack.InsertAt(1,val)
            
            next := '"' ((is_key := (ch == "{")) ? "}" : "]")
            continue
        }
        
        if InStr("}]", ch) {
            stack.RemoveAt(1)
            next := (stack[1] == tree) ? "" : (stack[1] is Array) ? ",]" : ",}"
            continue
        }
        
        if InStr(",:", ch) {
            is_key := (!is_array && ch == ",")
            next := is_key ? '"' : '"{[0123456789-tfn'
            continue
        }
        
        if (ch == '"') {
            i := pos
            while (i := InStr(src, '"',, i+1)) {
                val := StrReplace(SubStr(src, pos+1, i-pos-1), "\\", "\u005C")
                if (SubStr(val, -1) != "\")
                    break
            }
            if !i
                throw Error("Bad string", -1, SubStr(src, pos))
            
            val := StrReplace(val, "\/", "/")
            val := StrReplace(val, '\"', '"')
            val := StrReplace(val, "\b", "`b")
            val := StrReplace(val, "\f", "`f")
            val := StrReplace(val, "\n", "`n")
            val := StrReplace(val, "\r", "`r")
            val := StrReplace(val, "\t", "`t")
            
            i := 0
            while (i := InStr(val, "\u", true, i+1)) {
                if ((esc := Abs("0x" . SubStr(val, i+2, 4))) <= 0x7F)
                    val := StrReplace(val, SubStr(val, i, 6), Chr(esc))
                else {
                    esc2 := (((esc & 0x3FF) + 0xDC00) & 0xFFFF)
                    esc  := (((esc >> 10) & 0x3F) + 0xD800) & 0xFFFF
                    val := StrReplace(val, SubStr(val, i, 6), Chr(esc) . Chr(esc2))
                }
            }
            
            pos := i ; update pos
            
            is_array ? obj.Push(val) : is_key ? (key := val) : obj[key] := val
            
            next := is_array ? ",]" : is_key ? ":" : ",}"
            continue
        }
        
        if (ch >= "0" && ch <= "9") || (ch == "-") { ; digit
            i := pos
            while (SubStr(src, ++i, 1) ~= "[\d.eE\-+]")
                continue
            
            val := (SubStr(src, pos, i-pos) ~= "^[+\-]?\d+$") ? Integer(val) : Float(val)
            
            pos := i - 1
            
            is_array ? obj.Push(val) : obj[key] := val
            
            next := is_array ? ",]" : ",}"
            continue
        }
        
        static is_word := Map("true", true, "false", false, "null", "")
        
        if InStr("tfn", ch, true) { ; true, false, null
            i := pos
            while (i <= StrLen(src) && (ch := SubStr(src, i, 1)) ~= "[a-z]")
                val .= ch, i++
            
            if !is_word.Has(val)
                throw Error("Bad word", -1, val)
            
            pos := i - 1
            
            is_array ? obj.Push(is_word[val]) : obj[key] := is_word[val]
            
            next := is_array ? ",]" : ",}"
            continue
        }
        
        throw Error("Bad value", -1, SubStr(src, pos))
    }
    
    return tree[1]
}

Jxon_Dump(obj, indent:="", lvl:=1) {
    if IsObject(obj) {
        if (obj is Array) {  ; Array
            for k, v in obj
                res .= (res ? ",`n" : "") Jxon_Dump(v, indent, lvl+1)
            
            return "[`n" res "`n" indent "]"
        } else {  ; Map
            for k, v in obj
                res .= (res ? ",`n" : "") indent (LTrim(k,'"')~="[.\d\[\]]" ? "[" k "]" 
                          : '"' Jxon_Escape(k) '"') ": " Jxon_Dump(v, indent, lvl+1)
        }
        
        return IsObject(obj) ? "{`n" res "`n" indent "}" : '"' Jxon_Escape(obj) '"'
    }
    
    return (Type(obj) == "String") ? '"' Jxon_Escape(obj) '"' : obj
}

Jxon_Escape(str) {
    if (str == "")
        return ""
        
    str := StrReplace(str, "\", "\\")
    str := StrReplace(str, "`t", "\t")
    str := StrReplace(str, "`r", "\r")
    str := StrReplace(str, "`n", "\n")
    str := StrReplace(str, "`b", "\b")
    str := StrReplace(str, "`f", "\f")
    str := StrReplace(str, "/", "\/")
    str := StrReplace(str, '"', '\"')
    
    return str
}

