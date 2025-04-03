using System;
using System.Windows.Input;
using NHotkey;
using NHotkey.Wpf;
using SnippetButler.Models;

namespace SnippetButler.Services
{
    public class HotkeyService
    {
        private readonly SettingsService _settingsService;
        private readonly string _hotkeyId = "SnippetButlerHotkey";
        private bool _isRegistered = false;
        
        public event EventHandler? SnippetSelectorRequested;
        
        public HotkeyService(SettingsService settingsService)
        {
            _settingsService = settingsService;
            _settingsService.SettingsChanged += SettingsService_SettingsChanged;
        }
        
        private void SettingsService_SettingsChanged(object? sender, EventArgs e)
        {
            if (_isRegistered)
            {
                // 热键配置已更改，重新注册
                UnregisterHotkeys();
                RegisterHotkeys();
            }
        }
        
        public bool RegisterHotkeys()
        {
            try
            {
                string hotkeyString = _settingsService.CurrentSettings.Hotkey;
                
                // 解析热键字符串
                var keyGesture = ParseHotkey(hotkeyString);
                
                if (keyGesture != null)
                {
                    // 注册热键
                    HotkeyManager.Current.AddOrReplace(_hotkeyId, keyGesture.Key, keyGesture.Modifiers, OnHotkeyPressed);
                    _isRegistered = true;
                    return true;
                }
                
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"注册热键失败: {ex.Message}");
                return false;
            }
        }
        
        public void UnregisterHotkeys()
        {
            try
            {
                if (_isRegistered)
                {
                    HotkeyManager.Current.Remove(_hotkeyId);
                    _isRegistered = false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"注销热键失败: {ex.Message}");
            }
        }
        
        private void OnHotkeyPressed(object? sender, HotkeyEventArgs e)
        {
            SnippetSelectorRequested?.Invoke(this, EventArgs.Empty);
            e.Handled = true;
        }
        
        private KeyGesture? ParseHotkey(string hotkeyString)
        {
            try
            {
                // "Control+Shift+Space" => 转换为KeyGesture
                if (string.IsNullOrEmpty(hotkeyString))
                    return null;
                
                // 拆分修饰键和主键
                string[] parts = hotkeyString.Split('+');
                
                if (parts.Length == 0)
                    return null;
                
                // 获取主键（最后一部分）
                string keyStr = parts[^1].Trim();
                
                // 转换为Key
                if (!Enum.TryParse<Key>(keyStr, true, out Key key))
                {
                    // 尝试一些常见别名
                    if (keyStr.Equals("Space", StringComparison.OrdinalIgnoreCase))
                        key = Key.Space;
                    else if (keyStr.Equals("Escape", StringComparison.OrdinalIgnoreCase) || keyStr.Equals("Esc", StringComparison.OrdinalIgnoreCase))
                        key = Key.Escape;
                    else if (keyStr.Equals("Enter", StringComparison.OrdinalIgnoreCase) || keyStr.Equals("Return", StringComparison.OrdinalIgnoreCase))
                        key = Key.Enter;
                    else
                        return null;
                }
                
                // 解析修饰键
                ModifierKeys modifiers = ModifierKeys.None;
                
                for (int i = 0; i < parts.Length - 1; i++)
                {
                    string modStr = parts[i].Trim();
                    
                    if (modStr.Equals("Ctrl", StringComparison.OrdinalIgnoreCase) || 
                        modStr.Equals("Control", StringComparison.OrdinalIgnoreCase))
                        modifiers |= ModifierKeys.Control;
                    else if (modStr.Equals("Alt", StringComparison.OrdinalIgnoreCase))
                        modifiers |= ModifierKeys.Alt;
                    else if (modStr.Equals("Shift", StringComparison.OrdinalIgnoreCase))
                        modifiers |= ModifierKeys.Shift;
                    else if (modStr.Equals("Win", StringComparison.OrdinalIgnoreCase) || 
                             modStr.Equals("Windows", StringComparison.OrdinalIgnoreCase))
                        modifiers |= ModifierKeys.Windows;
                }
                
                return new KeyGesture(key, modifiers);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"解析热键字符串失败: {ex.Message}");
                return null;
            }
        }
        
        // 将AHK热键字符串转换为WPF热键字符串
        public static string ConvertAhkHotkeyToWpf(string ahkHotkey)
        {
            if (string.IsNullOrEmpty(ahkHotkey))
                return string.Empty;
            
            return ahkHotkey
                .Replace("^", "Control+")
                .Replace("!", "Alt+")
                .Replace("+", "Shift+")
                .Replace("#", "Windows+")
                .Replace("Space", "Space");
        }
    }
} 