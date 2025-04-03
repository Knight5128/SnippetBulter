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
            // 添加消息处理器
            webView.WebMessageReceived += WebView_WebMessageReceived;
            
            // 禁用默认上下文菜单
            await webView.ExecuteScriptAsync("document.addEventListener('contextmenu', event => event.preventDefault());");
        }
        
        public async Task SendDataToWebView(CoreWebView2 webView)
        {
            try
            {
                var data = new
                {
                    snippets = _snippetManager.GetAllSnippets(),
                    settings = _settingsService.CurrentSettings
                };
                
                string json = JsonConvert.SerializeObject(data);
                await webView.ExecuteScriptAsync($"window.receiveData({json})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"向WebView发送数据失败: {ex.Message}");
            }
        }
        
        private void WebView_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.WebMessageAsJson;
                var message = JsonConvert.DeserializeObject<WebViewMessage>(json);
                
                if (message == null)
                    return;
                
                switch (message.Action)
                {
                    case "getData":
                        HandleGetDataMessage(sender as CoreWebView2);
                        break;
                    
                    case "saveData":
                        HandleSaveDataMessage(message);
                        break;
                    
                    case "updateSettings":
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
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"处理WebView消息失败: {ex.Message}");
            }
        }
        
        private async void HandleGetDataMessage(CoreWebView2? webView)
        {
            if (webView != null)
            {
                await SendDataToWebView(webView);
            }
        }
        
        private void HandleSaveDataMessage(WebViewMessage message)
        {
            if (message.Snippets != null)
            {
                SaveSnippetsData(message.Snippets);
            }
        }
        
        private void HandleUpdateSettingsMessage(WebViewMessage message)
        {
            if (message.Settings != null)
            {
                _settingsService.UpdateSettings(message.Settings);
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
        
        private void SaveSnippetsData(Dictionary<string, Dictionary<string, string>> snippets)
        {
            // 清空现有数据并添加新数据
            _snippetManager.GetAllSnippets().Clear();
            
            foreach (var group in snippets)
            {
                foreach (var snippet in group.Value)
                {
                    _snippetManager.AddSnippet(group.Key, snippet.Key, snippet.Value);
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
    }
} 