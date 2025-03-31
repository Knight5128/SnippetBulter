; WebView2 打包与安装辅助模块
; 该模块负责WebView2运行时的打包、检测与安装
#Requires AutoHotkey v2.0

class WebView2Packager {
    static runtimeVersions := Map(
        "stable", "https://go.microsoft.com/fwlink/p/?LinkId=2124703"  ; 引导安装程序 (Evergreen Bootstrapper)
    )
    
    static resourcesDir := A_ScriptDir "\resources"
    static packagedFilename := "MicrosoftEdgeWebview2Setup.exe"  ; 改为使用引导安装程序文件名
    
    ; 检查资源目录中是否已包含WebView2运行时
    static HasPackagedRuntime() {
        return FileExist(this.resourcesDir "\" this.packagedFilename)
    }
    
    ; 下载WebView2运行时引导安装程序到资源目录
    static DownloadRuntime() {
        if !DirExist(this.resourcesDir)
            DirCreate(this.resourcesDir)
            
        targetFile := this.resourcesDir "\" this.packagedFilename
        downloadUrl := this.runtimeVersions["stable"]
        
        try {
            ToolTip("正在下载WebView2引导安装程序...")
            Download(downloadUrl, targetFile)
            ToolTip("下载完成!")
            SetTimer () => ToolTip(), -2000
            return true
        } catch Error as e {
            ToolTip()
            MsgBox("下载WebView2引导安装程序失败: " e.Message, "下载错误", "Icon!")
            return false
        }
    }
    
    ; 从资源目录安装WebView2运行时
    static InstallFromPackaged() {
        installerPath := this.resourcesDir "\" this.packagedFilename
        
        if !FileExist(installerPath) {
            MsgBox("未找到WebView2引导安装程序，将尝试下载。", "提示", "Icon!")
            if !this.DownloadRuntime()
                return false
        }
        
        try {
            ToolTip("正在安装WebView2运行时...")
            ; 使用/silent参数静默安装
            RunWait(installerPath " /silent /install", , "Hide")
            ToolTip("WebView2运行时安装完成！")
            SetTimer () => ToolTip(), -2000
            return true
        } catch Error as e {
            ToolTip()
            MsgBox("安装WebView2运行时失败: " e.Message, "安装错误", "Icon!")
            return false
        }
    }
    
    ; 准备打包: 下载WebView2运行时并保存到资源目录供安装程序使用
    static PrepareForPackaging() {
        if this.HasPackagedRuntime() {
            MsgBox("WebView2引导安装程序已存在于资源目录中。", "准备打包", "Icon!")
            return true
        }
        
        MsgBox("将下载WebView2引导安装程序。", "准备打包", "Icon!")
        return this.DownloadRuntime()
    }
}

; 导出一个创建打包向导的函数
ShowPackagingWizard() {
    ; 创建向导窗口
    wizard := Gui("+AlwaysOnTop", "WebView2运行时打包向导")
    wizard.SetFont("s10", "Segoe UI")
    wizard.MarginX := 20
    wizard.MarginY := 20
    
    ; 添加说明文本
    wizard.Add("Text", "w400", "这个向导将帮助您为应用程序打包WebView2运行时。")
    wizard.Add("Text", "w400 y+10", "1. 准备打包: 下载WebView2引导安装程序到资源目录")
    wizard.Add("Text", "w400 y+5", "2. 创建安装程序: 将资源目录中的引导安装程序包含在您的安装程序中")
    wizard.Add("Text", "w400 y+5", "3. 应用启动时: 优先使用打包的引导安装程序安装WebView2运行时")
    
    ; 添加说明
    wizard.Add("Text", "y+20 w400", "WebView2引导安装程序是一个小型程序(约2MB)，它会在联网环境下")
    wizard.Add("Text", "w400", "下载并安装最新版本的WebView2运行时。")
    
    ; 添加操作按钮
    wizard.Add("Button", "y+20 w180", "下载引导安装程序").OnEvent("Click", DownloadRuntime)
    wizard.Add("Button", "x+10 w180", "检查运行时状态").OnEvent("Click", CheckStatus)
    
    ; 添加底部按钮
    wizard.Add("Button", "y+30 w120", "关闭").OnEvent("Click", (*) => wizard.Destroy())
    
    ; 显示窗口
    wizard.Show("w440")
    
    ; 处理下载运行时按钮
    DownloadRuntime(*) {
        ; 创建资源目录
        if !DirExist(WebView2Packager.resourcesDir)
            DirCreate(WebView2Packager.resourcesDir)
            
        ; 设置目标文件和下载URL
        targetFile := WebView2Packager.resourcesDir "\" WebView2Packager.packagedFilename
        downloadUrl := WebView2Packager.runtimeVersions["stable"]
        
        ; 下载文件
        try {
            MsgBox("将开始下载WebView2引导安装程序到资源目录。`n此程序大小约2MB，下载通常很快完成。", "下载", "Icon!")
            ToolTip("正在下载WebView2引导安装程序...")
            Download(downloadUrl, targetFile)
            ToolTip("下载完成!")
            SetTimer () => ToolTip(), -2000
            MsgBox("WebView2引导安装程序已成功下载到资源目录: `n" targetFile, "下载成功", "Icon!")
        } catch Error as e {
            ToolTip()
            MsgBox("下载WebView2引导安装程序失败: " e.Message, "下载错误", "Icon!")
        }
    }
    
    ; 处理检查状态按钮
    CheckStatus(*) {
        statusMsg := "WebView2运行时状态检查:`n`n"
        
        ; 检查资源目录
        if !DirExist(WebView2Packager.resourcesDir)
            statusMsg .= "✗ 资源目录不存在`n"
        else
            statusMsg .= "✓ 资源目录存在`n"
            
        ; 检查引导安装程序
        bootstrapperPath := WebView2Packager.resourcesDir "\" WebView2Packager.packagedFilename
        if !FileExist(bootstrapperPath)
            statusMsg .= "✗ 引导安装程序不存在`n"
        else
            statusMsg .= "✓ 引导安装程序已下载 (" Floor(FileGetSize(bootstrapperPath) / 1024 / 1024) " MB)`n"
            
        ; 检查系统是否已安装WebView2
        try {
            ; 获取当前系统位数对应的注册表视图
            regView := A_Is64bitOS ? "64" : "32"
            installed := false
            version := "未知"
            
            ; 定义待检查的注册表路径
            regPaths := [
                ; HKLM路径 (适用于系统级安装)
                "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
                "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
                
                ; HKCU路径 (适用于用户级安装)
                "HKEY_CURRENT_USER\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
            ]
            
            ; 检查每个注册表路径
            Loop regPaths.Length {
                regPath := regPaths[A_Index]
                
                Try {
                    ; 检查注册表路径是否存在
                    Loop Reg, regPath, regView {
                        ; 检查pv (版本)值
                        Try {
                            version := RegRead(regPath, "pv")
                            
                            ; 判断版本是否有效
                            if (version != "" && version != "null" && version != "0.0.0.0") {
                                installed := true
                                break 2 ; 跳出两层循环
                            }
                        } Catch {
                            ; 如果无法读取pv值，继续检查
                        }
                        
                        break ; 只需要检查一次路径存在性
                    }
                } Catch {
                    ; 如果无法访问此注册表路径，继续检查下一个
                }
            }
            
            if installed
                statusMsg .= "✓ 系统已安装WebView2运行时 (版本: " version ")`n"
            else {
                ; 如果注册表检查失败，尝试文件检查
                if FileExist(A_WinDir "\System32\msedgewebview2.exe") || 
                   FileExist(A_WinDir "\SysWOW64\msedgewebview2.exe")
                    statusMsg .= "✓ 系统已安装WebView2运行时 (通过文件检测)`n"
                else
                    statusMsg .= "✗ 系统未安装WebView2运行时`n"
            }
        } catch Error as e {
            statusMsg .= "? 无法检查系统WebView2运行时状态: " e.Message "`n"
        }
        
        MsgBox(statusMsg, "WebView2状态检查", "Icon!")
    }
} 