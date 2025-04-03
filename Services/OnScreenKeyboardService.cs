using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using SnippetButler.Models;

namespace SnippetButler.Services
{
    public class OnScreenKeyboardService
    {
        private readonly SettingsService _settingsService;
        private OnScreenKeyboardWindow? _keyboardWindow;
        private bool _isEnabled = false;
        
        public OnScreenKeyboardService(SettingsService settingsService)
        {
            _settingsService = settingsService;
            _settingsService.SettingsChanged += SettingsService_SettingsChanged;
            
            // 根据设置决定是否启用
            UpdateState();
        }
        
        private void SettingsService_SettingsChanged(object? sender, EventArgs e)
        {
            UpdateState();
        }
        
        private void UpdateState()
        {
            bool shouldBeEnabled = _settingsService.CurrentSettings.Scripts.OnScreenKeyboard;
            
            if (shouldBeEnabled != _isEnabled)
            {
                if (shouldBeEnabled)
                {
                    StartKeyboardService();
                }
                else
                {
                    StopKeyboardService();
                }
            }
        }
        
        private void StartKeyboardService()
        {
            if (!_isEnabled)
            {
                _isEnabled = true;
                
                System.Windows.Application.Current.Dispatcher.Invoke(() =>
                {
                    if (_keyboardWindow == null || !_keyboardWindow.IsLoaded)
                    {
                        _keyboardWindow = new OnScreenKeyboardWindow();
                        _keyboardWindow.Closed += (s, e) => _keyboardWindow = null;
                    }
                    
                    _keyboardWindow.Show();
                });
                
                Console.WriteLine("屏幕键盘服务已启动");
            }
        }
        
        private void StopKeyboardService()
        {
            if (_isEnabled)
            {
                _isEnabled = false;
                
                System.Windows.Application.Current.Dispatcher.Invoke(() =>
                {
                    _keyboardWindow?.Close();
                    _keyboardWindow = null;
                });
                
                Console.WriteLine("屏幕键盘服务已停止");
            }
        }
    }
    
    public class OnScreenKeyboardWindow : Window
    {
        private readonly ClipboardService _clipboardService;
        
        public OnScreenKeyboardWindow()
        {
            // 获取剪贴板服务
            _clipboardService = ((App)System.Windows.Application.Current).GetService<ClipboardService>();
            
            // 设置窗口属性
            Title = "屏幕键盘";
            Width = 800;
            Height = 230;
            ResizeMode = ResizeMode.CanResize;
            Topmost = true;
            WindowStyle = WindowStyle.ToolWindow;
            ShowInTaskbar = false;
            
            // 创建主布局
            var grid = new Grid();
            Content = grid;
            
            // 创建键盘布局
            var keyboardPanel = new StackPanel
            {
                Orientation = System.Windows.Controls.Orientation.Vertical
            };
            grid.Children.Add(keyboardPanel);
            
            // 添加键盘行
            keyboardPanel.Children.Add(CreateKeyboardRow(new[] { "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "← Backspace" }));
            keyboardPanel.Children.Add(CreateKeyboardRow(new[] { "Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\" }));
            keyboardPanel.Children.Add(CreateKeyboardRow(new[] { "Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter" }));
            keyboardPanel.Children.Add(CreateKeyboardRow(new[] { "Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "↑", "Shift" }));
            keyboardPanel.Children.Add(CreateKeyboardRow(new[] { "Ctrl", "Win", "Alt", "Space", "Alt", "←", "↓", "→", "Ctrl" }));
            
            // 设置窗口位置
            WindowStartupLocation = WindowStartupLocation.Manual;
            Left = SystemParameters.PrimaryScreenWidth / 2 - Width / 2;
            Top = SystemParameters.PrimaryScreenHeight - Height - 20;
            
            // 添加拖动支持
            MouseLeftButtonDown += (s, e) => DragMove();
        }
        
        private StackPanel CreateKeyboardRow(string[] keys)
        {
            var row = new StackPanel
            {
                Orientation = System.Windows.Controls.Orientation.Horizontal,
                Margin = new Thickness(5)
            };
            
            foreach (var key in keys)
            {
                // 设置按钮宽度
                double width = 40;
                if (key == "Space") width = 250;
                else if (key == "Backspace" || key == "Enter" || key == "Shift" || key == "Tab" || key == "Caps") width = 80;
                
                var button = new System.Windows.Controls.Button
                {
                    Content = key,
                    Width = width,
                    Height = 30,
                    Margin = new Thickness(2),
                    Tag = key
                };
                
                // 为特殊按键设置不同的样式
                if (key == "Space")
                {
                    button.Background = System.Windows.Media.Brushes.LightBlue;
                }
                else if (key == "Shift" || key == "Ctrl" || key == "Alt" || key == "Win" || 
                         key == "Enter" || key == "Tab" || key == "Caps" || key == "Backspace")
                {
                    button.Background = System.Windows.Media.Brushes.LightGray;
                }
                
                // 添加按钮点击事件
                button.Click += Key_Click;
                
                row.Children.Add(button);
            }
            
            return row;
        }
        
        private void Key_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button button && button.Tag is string key)
            {
                string textToSend = "";
                
                switch (key)
                {
                    case "Space":
                        textToSend = " ";
                        break;
                    case "Enter":
                        textToSend = Environment.NewLine;
                        break;
                    case "Tab":
                        textToSend = "\t";
                        break;
                    // 特殊键处理 (在实际应用中，应该使用SendInput API模拟按键)
                    case "Shift":
                    case "Ctrl":
                    case "Alt":
                    case "Win":
                    case "Caps":
                    case "Backspace":
                    case "↑":
                    case "↓":
                    case "←":
                    case "→":
                        // 这些特殊键需要使用SendInput API，此处简化处理
                        return;
                    default:
                        textToSend = key;
                        break;
                }
                
                // 复制到剪贴板并发送
                _clipboardService?.CopyToClipboard(textToSend);
                
                // 在实际应用中，这里应该使用SendInput API模拟Ctrl+V操作
                // 但这需要额外的Win32 API调用，此处简化处理
            }
        }
    }
} 