using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using SnippetButler.Models;

namespace SnippetButler.Services
{
    public class WebViewService
    {
        private readonly SnippetManager _snippetManager;
        private readonly SettingsService _settingsService;
        private readonly ClipboardService _clipboardService;
        
        public WebViewService(SnippetManager snippetManager, SettingsService settingsService, ClipboardService clipboardService)
        {
            _snippetManager = snippetManager;
            _settingsService = settingsService;
            _clipboardService = clipboardService;
        }
        
        public async Task InitializeWebView(CoreWebView2 webView)
        {
            Console.WriteLine("初始化WebView...");
            
            // 确保数据已加载
            Console.WriteLine("确保数据已加载...");
            bool snippetsLoaded = _snippetManager.LoadSnippets();
            bool settingsLoaded = _settingsService.LoadSettings();
            Console.WriteLine($"数据加载状态: 片段={snippetsLoaded}, 设置={settingsLoaded}");
            
            // 添加消息处理器
            webView.WebMessageReceived += WebView_WebMessageReceived;
            
            // 禁用默认上下文菜单
            await webView.ExecuteScriptAsync("document.addEventListener('contextmenu', event => event.preventDefault());");
            
            // 添加页面加载完成事件处理
            webView.NavigationCompleted += async (s, e) => {
                Console.WriteLine($"页面导航完成: 成功={e.IsSuccess}, URL={webView.Source}");
                if (e.IsSuccess) {
                    // 添加控制台监听
                    await webView.ExecuteScriptAsync(@"
                        console.originalLog = console.log;
                        console.log = function() {
                            console.originalLog.apply(console, arguments);
                            window.chrome.webview.postMessage({
                                action: 'console',
                                type: 'log',
                                message: Array.from(arguments).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
                            });
                        };
                        
                        console.originalError = console.error;
                        console.error = function() {
                            console.originalError.apply(console, arguments);
                            window.chrome.webview.postMessage({
                                action: 'console',
                                type: 'error',
                                message: Array.from(arguments).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
                            });
                        };
                        
                        window.addEventListener('error', function(event) {
                            window.chrome.webview.postMessage({
                                action: 'console',
                                type: 'uncaught',
                                message: event.message + ' at ' + event.filename + ':' + event.lineno
                            });
                        });
                    ");
                    
                    // 页面加载完成后，主动发送数据
                    Console.WriteLine("页面加载完成，主动发送数据...");
                    SendDataToWebView(webView);
                }
            };
        }
        
        public void SendDataToWebView(CoreWebView2 webView)
        {
            if (webView == null) 
            {
                Console.WriteLine("SendDataToWebView 失败: WebView 为 null");
                return;
            }

            try
            {
                // 检查数据是否已加载
                var snippetsData = _snippetManager.GetAllSnippets();
                if (snippetsData == null || snippetsData.Count == 0)
                {
                    Console.WriteLine("检测到片段数据为空，重新加载或初始化...");
                    _snippetManager.LoadSnippets();
                    snippetsData = _snippetManager.GetAllSnippets();
                }
                
                var settings = _settingsService.CurrentSettings;
                if (settings == null)
                {
                    Console.WriteLine("检测到设置为空，重新加载或初始化...");
                    _settingsService.LoadSettings();
                    settings = _settingsService.CurrentSettings;
                }
                
                var dataPayload = new
                {
                    data = snippetsData, // 使用 'data' 键匹配 JS 中的 message.data
                    settings = settings
                };
                
                Console.WriteLine($"准备发送数据到WebView: {snippetsData.Count}个分组, 设置对象: {settings != null}");
                
                // 使用 PostWebMessageAsJson 发送结构化消息
                string jsonPayload = JsonConvert.SerializeObject(dataPayload);
                webView.PostWebMessageAsJson(jsonPayload);
                Console.WriteLine("已通过 PostWebMessageAsJson 向 WebView 发送数据");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"向 WebView 发送数据失败: {ex.Message}");
            }
        }
        
        private void WebView_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.WebMessageAsJson;
                Console.WriteLine($"收到WebView消息: {json.Substring(0, Math.Min(json.Length, 100))}...");
                
                var message = JsonConvert.DeserializeObject<WebViewMessage>(json);
                
                if (message == null)
                    return;
                
                // 处理控制台消息
                if (message.Action == "console") {
                    Console.WriteLine($"浏览器控制台 [{message.Type}]: {message.Message}");
                    return;
                }
                
                switch (message.Action)
                {
                    case "getData":
                        HandleGetDataMessage(sender as CoreWebView2);
                        break;
                    
                    case "saveData":
                        HandleSaveDataMessage(message);
                        break;
                    
                    case "saveSettings":
                    case "updateSettings": // 处理两种可能的消息名称
                        HandleUpdateSettingsMessage(message);
                        break;
                    
                    case "copySnippet":
                        HandleCopySnippetMessage(message);
                        break;
                    
                    case "hideWindow":
                    case "close":
                        HandleCloseMessage(sender);
                        break;
                    
                    case "toggleScript":
                        HandleToggleScriptMessage(message);
                        break;
                        
                    default:
                        Console.WriteLine($"未处理的消息类型: {message.Action}");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"处理WebView消息失败: {ex.Message}\n{ex.StackTrace}");
            }
        }
        
        private void HandleGetDataMessage(CoreWebView2? webView)
        {
            Console.WriteLine("收到 'getData' 请求，准备发送数据...");
            if (webView != null)
            {
                SendDataToWebView(webView);
            }
            else
            {
                Console.WriteLine("HandleGetDataMessage 失败: WebView 为 null");
            }
        }
        
        private void HandleSaveDataMessage(WebViewMessage message)
        {
            if (message.Snippets != null)
            {
                // 使用新的SaveSnippetsDataAsync方法直接保存从JavaScript接收的数据
                _ = _snippetManager.SaveSnippetsDataAsync(message.Snippets);
                Console.WriteLine("已接收并保存从前端传来的片段数据");
            }
            else
            {
                Console.WriteLine("接收到saveData消息，但片段数据为null");
            }
        }
        
        private void HandleUpdateSettingsMessage(WebViewMessage message)
        {
            if (message.Settings != null)
            {
                // 使用新的UpdateSettingsFromJsAsync方法直接更新从JavaScript接收的设置
                _ = _settingsService.UpdateSettingsFromJsAsync(message.Settings);
                Console.WriteLine("已接收并保存从前端传来的设置数据");
            }
            else
            {
                Console.WriteLine("接收到updateSettings消息，但设置数据为null");
            }
        }
        
        private async void HandleCopySnippetMessage(WebViewMessage message)
        {
            if (!string.IsNullOrEmpty(message.Content))
            {
                await _clipboardService.CopyToClipboardAsync(message.Content);
                
                // 如果设置为自动隐藏，则关闭窗口
                if (message.AutoHide.HasValue && message.AutoHide.Value)
                {
                    HandleCloseMessage(null);
                }
            }
        }
        
        private void HandleCloseMessage(object? sender)
        {
            WebViewClosed?.Invoke(sender, EventArgs.Empty);
        }
        
        private void HandleToggleScriptMessage(WebViewMessage message)
        {
            if (!string.IsNullOrEmpty(message.Name) && message.Enabled.HasValue)
            {
                switch (message.Name.ToLower())
                {
                    case "easy-window-dragging":
                        _settingsService.UpdateEasyWindowDragging(message.Enabled.Value);
                        break;
                    
                    case "on-screen-keyboard":
                        _settingsService.UpdateOnScreenKeyboard(message.Enabled.Value);
                        break;
                }
            }
        }
        
        public event EventHandler? WebViewClosed;
    }
    
    public class WebViewMessage
    {
        [JsonProperty("action")]
        public string Action { get; set; } = string.Empty;
        
        [JsonProperty("snippets")]
        public Dictionary<string, Dictionary<string, string>>? Snippets { get; set; }
        
        [JsonProperty("settings")]
        public Settings? Settings { get; set; }
        
        [JsonProperty("content")]
        public string? Content { get; set; }
        
        [JsonProperty("autoHide")]
        public bool? AutoHide { get; set; }
        
        [JsonProperty("name")]
        public string? Name { get; set; }
        
        [JsonProperty("enabled")]
        public bool? Enabled { get; set; }
        
        [JsonProperty("group")]
        public string? Group { get; set; }
        
        [JsonProperty("type")]
        public string Type { get; set; } = string.Empty;
        
        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;
    }
} 