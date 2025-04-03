using System;
using System.Windows;
using SnippetButler.Windows;

namespace SnippetButler.Services
{
    public class WebView2InstanceManager
    {
        private WebViewWindow? _selectorWindow;
        private WebViewWindow? _managementWindow;
        private readonly WebViewService _webViewService;
        private readonly SettingsService _settingsService;
        
        public WebView2InstanceManager()
        {
            _webViewService = ((App)System.Windows.Application.Current).GetService<WebViewService>();
            _settingsService = ((App)System.Windows.Application.Current).GetService<SettingsService>();
        }
        
        public void ShowSelectorWindow()
        {
            try
            {
                System.Windows.Application.Current.Dispatcher.Invoke(() =>
                {
                    if (_selectorWindow == null)
                    {
                        _selectorWindow = new WebViewWindow(_webViewService, true);
                        
                        // 设置窗口属性
                        _selectorWindow.Topmost = _settingsService.CurrentSettings.AlwaysOnTop;
                        
                        // 设置窗口位置为屏幕中心
                        _selectorWindow.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                    }
                    
                    // 显示窗口
                    if (_selectorWindow.Visibility != Visibility.Visible)
                    {
                        _selectorWindow.Show();
                        _selectorWindow.Activate();
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"显示选择器窗口失败: {ex.Message}");
            }
        }
        
        public void ShowManagementWindow()
        {
            try
            {
                System.Windows.Application.Current.Dispatcher.Invoke(() =>
                {
                    if (_managementWindow == null || !_managementWindow.IsLoaded)
                    {
                        _managementWindow = new WebViewWindow(_webViewService, false);
                        
                        // 设置窗口属性
                        _managementWindow.Topmost = false;
                        _managementWindow.ShowInTaskbar = true;
                        
                        // 设置窗口位置为屏幕中心
                        _managementWindow.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                    }
                    
                    // 显示窗口
                    _managementWindow.Show();
                    _managementWindow.Activate();
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"显示管理面板窗口失败: {ex.Message}");
            }
        }
    }
} 