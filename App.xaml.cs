using System;
using System.IO;
using System.Windows;
using Hardcodet.Wpf.TaskbarNotification;
using SnippetButler.Services;

namespace SnippetButler
{
    /// <summary>
    /// App.xaml 的交互逻辑
    /// </summary>
    public partial class App : System.Windows.Application
    {
        private TaskbarIcon? _notifyIcon;
        private SnippetManager _snippetManager = null!;
        private WebViewService _webViewService = null!;
        private HotkeyService _hotkeyService = null!;
        private ClipboardService _clipboardService = null!;
        private SettingsService _settingsService = null!;
        private WebView2InstanceManager _webViewManager = null!;
        
        // 这些服务目前未使用，为避免警告暂时注释掉
        // 当需要这些功能时可以取消注释
        // private EasyWindowDraggingService? _windowDraggingService;
        // private OnScreenKeyboardService? _onScreenKeyboardService;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            // 创建应用程序目录
            EnsureAppDirectoriesExist();
            
            // 初始化服务
            _settingsService = new SettingsService();
            _settingsService.LoadSettings();
            
            _snippetManager = new SnippetManager();
            _snippetManager.LoadSnippets();
            
            _clipboardService = new ClipboardService();
            
            // 初始化WebView服务
            _webViewService = new WebViewService(_snippetManager, _settingsService, _clipboardService);
            
            // 初始化WebView管理器
            _webViewManager = new WebView2InstanceManager();
            
            // 托盘图标
            _notifyIcon = (TaskbarIcon)FindResource("NotifyIcon");
            if (_notifyIcon == null)
            {
                System.Windows.MessageBox.Show("无法创建托盘图标，应用将退出。", "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                Shutdown();
                return;
            }
            
            // 托盘图标双击事件（直接在XAML中配置会更好，这里仅作示例）
            _notifyIcon.TrayMouseDoubleClick += (s, e) => _webViewManager.ShowManagementWindow();
            
            // 注册全局热键
            _hotkeyService = new HotkeyService(_settingsService);
            _hotkeyService.SnippetSelectorRequested += (s, e) => _webViewManager.ShowSelectorWindow();
            _hotkeyService.RegisterHotkeys();
            
            // 加载辅助功能服务
            // 目前未启用，当需要时可以取消注释
            // InitializeHelperServices();
        }
        
        // private void InitializeHelperServices()
        // {
        //     // 如果设置中启用了这些功能，则初始化相应服务
        //     if (_settingsService.CurrentSettings.Scripts.EasyWindowDragging)
        //     {
        //         _windowDraggingService = new EasyWindowDraggingService(_settingsService);
        //     }
        //
        //     if (_settingsService.CurrentSettings.Scripts.OnScreenKeyboard)
        //     {
        //         _onScreenKeyboardService = new OnScreenKeyboardService(_settingsService);
        //     }
        // }
        
        // 托盘菜单事件处理器
        private void OpenManager_Click(object sender, RoutedEventArgs e)
        {
            _webViewManager.ShowManagementWindow();
        }
        
        private void Exit_Click(object sender, RoutedEventArgs e)
        {
            Shutdown();
        }

        protected override void OnExit(ExitEventArgs e)
        {
            // 释放资源
            _hotkeyService.UnregisterHotkeys();
            _notifyIcon?.Dispose();
            
            base.OnExit(e);
        }

        private void EnsureAppDirectoriesExist()
        {
            // 使用应用程序根目录下的data目录
            string appBaseDir = Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory) ?? string.Empty;
            string dataPath = Path.Combine(appBaseDir, "data");
            
            if (!Directory.Exists(dataPath))
            {
                Directory.CreateDirectory(dataPath);
                Console.WriteLine($"创建数据目录: {dataPath}");
            }
        }
    }
} 