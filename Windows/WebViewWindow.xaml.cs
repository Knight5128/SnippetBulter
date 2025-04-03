using System;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using SnippetButler.Services;

namespace SnippetButler.Windows
{
    /// <summary>
    /// WebViewWindow.xaml 的交互逻辑
    /// </summary>
    public partial class WebViewWindow : Window
    {
        private readonly WebViewService _webViewService;
        private readonly string _htmlPath;
        private readonly bool _isSelector;
        
        public WebViewWindow(WebViewService webViewService, bool isSelector = false)
        {
            InitializeComponent();
            
            _webViewService = webViewService;
            _isSelector = isSelector;
            
            // 设置HTML路径
            string fileName = isSelector ? "selector.html" : "index.html";
            _htmlPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "frontend", fileName);
            
            // 订阅WebView关闭事件
            _webViewService.WebViewClosed += WebViewService_WebViewClosed;
        }
        
        private void WebViewService_WebViewClosed(object? sender, EventArgs e)
        {
            // 如果是选择器窗口，则隐藏而不是关闭
            if (_isSelector)
            {
                Dispatcher.Invoke(() => Hide());
            }
            else
            {
                Dispatcher.Invoke(() => Close());
            }
        }
        
        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // 设置窗口标题
                Title = _isSelector ? "文本片段选择器" : "Snippet Butler - 管理面板";
                
                // 如果是选择器窗口，调整大小
                if (_isSelector)
                {
                    Width = 500;
                    Height = 400;
                }
                
                // 确保WebView2环境可用 - 使用相对于应用程序的数据目录
                string userDataFolder = Path.Combine(
                    Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory) ?? string.Empty,
                    "WebView2Data");
                    
                // 确保目录存在
                Directory.CreateDirectory(userDataFolder);
                
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                
                await webView.EnsureCoreWebView2Async(env);
                
                // 导航到目标页面
                if (File.Exists(_htmlPath))
                {
                    webView.CoreWebView2.Navigate(new Uri(_htmlPath).ToString());
                }
                else
                {
                    System.Windows.MessageBox.Show($"无法找到文件: {_htmlPath}", "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                    Close();
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show($"初始化WebView2失败: {ex.Message}", "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }
        
        private async void WebView_CoreWebView2InitializationCompleted(object sender, CoreWebView2InitializationCompletedEventArgs e)
        {
            if (e.IsSuccess)
            {
                progressBar.Visibility = Visibility.Collapsed;
                
                // 初始化WebView
                await _webViewService.InitializeWebView(webView.CoreWebView2);
            }
            else
            {
                System.Windows.MessageBox.Show($"初始化WebView2失败: {e.InitializationException.Message}", 
                    "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }
        
        private void WebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            // 消息已经由WebViewService处理，此处不需要额外处理
        }
        
        private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            // 如果是选择器窗口，仅隐藏而不是关闭
            if (_isSelector)
            {
                e.Cancel = true;
                Hide();
            }
            else
            {
                _webViewService.WebViewClosed -= WebViewService_WebViewClosed;
            }
        }
    }
} 