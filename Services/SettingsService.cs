using System;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json;
using SnippetButler.Models;

namespace SnippetButler.Services
{
    public class SettingsService
    {
        private readonly string _settingsPath;
        private Settings _settings = new();
        
        public event EventHandler? SettingsChanged;
        
        public Settings CurrentSettings => _settings;
        
        public SettingsService()
        {
            _settingsPath = Path.Combine(
                Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory) ?? string.Empty,
                "AppData",
                "settings.json");
                
            // 确保目录存在
            Directory.CreateDirectory(Path.GetDirectoryName(_settingsPath) ?? string.Empty);
        }
        
        public bool LoadSettings()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    string json = File.ReadAllText(_settingsPath);
                    _settings = JsonConvert.DeserializeObject<Settings>(json) ?? new Settings();
                    return true;
                }
                
                // 如果文件不存在，使用默认设置并保存
                _settings = new Settings();
                _ = SaveSettingsAsync();
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"加载设置失败: {ex.Message}");
                _settings = new Settings();
                return false;
            }
        }
        
        public async Task SaveSettingsAsync()
        {
            try
            {
                string json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                await File.WriteAllTextAsync(_settingsPath, json);
                SettingsChanged?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"保存设置失败: {ex.Message}");
            }
        }
        
        public void UpdateSettings(Settings newSettings)
        {
            _settings = newSettings;
            _ = SaveSettingsAsync();
        }
        
        public void UpdateHotkey(string hotkey)
        {
            _settings.Hotkey = hotkey;
            _ = SaveSettingsAsync();
        }
        
        public void UpdateAutoHide(bool autoHide)
        {
            _settings.AutoHide = autoHide;
            _ = SaveSettingsAsync();
        }
        
        public void UpdateAlwaysOnTop(bool alwaysOnTop)
        {
            _settings.AlwaysOnTop = alwaysOnTop;
            _ = SaveSettingsAsync();
        }
        
        public void UpdateEasyWindowDragging(bool enabled)
        {
            _settings.Scripts.EasyWindowDragging = enabled;
            _ = SaveSettingsAsync();
        }
        
        public void UpdateOnScreenKeyboard(bool enabled)
        {
            _settings.Scripts.OnScreenKeyboard = enabled;
            _ = SaveSettingsAsync();
        }
    }
} 