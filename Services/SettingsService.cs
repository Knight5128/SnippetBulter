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
            // 使用应用程序根目录下的data目录
            string baseDir = Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory) ?? string.Empty;
            _settingsPath = Path.Combine(baseDir, "data", "settings.json");
                
            // 确保data目录存在
            Directory.CreateDirectory(Path.GetDirectoryName(_settingsPath) ?? string.Empty);
            
            Console.WriteLine($"设置文件路径: {_settingsPath}");
        }
        
        public bool LoadSettings()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    Console.WriteLine("尝试加载设置文件...");
                    string json = File.ReadAllText(_settingsPath);
                    
                    // 处理空文件或无效JSON的情况
                    if (string.IsNullOrWhiteSpace(json))
                    {
                        Console.WriteLine("设置文件为空，使用默认设置并保存");
                        _settings = new Settings();
                        _ = SaveSettingsAsync();
                        return true;
                    }
                    
                    try 
                    {
                        _settings = JsonConvert.DeserializeObject<Settings>(json) ?? new Settings();
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"解析设置JSON失败: {ex.Message}，使用默认设置并保存");
                        _settings = new Settings();
                        _ = SaveSettingsAsync();
                        return true;
                    }
                    
                    Console.WriteLine("成功加载设置");
                    return true;
                }
                
                Console.WriteLine("设置文件不存在，使用默认设置并创建文件");
                // 如果文件不存在，使用默认设置并立即同步保存
                _settings = new Settings();
                try {
                    // 确保目录存在
                    string? dirPath = Path.GetDirectoryName(_settingsPath);
                    if (!string.IsNullOrEmpty(dirPath) && !Directory.Exists(dirPath))
                    {
                        Console.WriteLine($"创建目录: {dirPath}");
                        Directory.CreateDirectory(dirPath);
                    }
                    
                    // 同步保存，确保文件立即创建
                    string json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                    File.WriteAllText(_settingsPath, json);
                    Console.WriteLine($"默认设置已同步保存到 {_settingsPath}");
                } catch (Exception ex) {
                    Console.WriteLine($"创建设置文件失败: {ex.Message}，但将继续使用默认设置");
                }
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"加载设置失败: {ex.Message}，使用默认设置");
                _settings = new Settings();
                // 尝试保存默认设置
                _ = SaveSettingsAsync();
                return true;
            }
        }
        
        public async Task SaveSettingsAsync()
        {
            try
            {
                // 确保目录存在
                string? dirPath = Path.GetDirectoryName(_settingsPath);
                if (!string.IsNullOrEmpty(dirPath) && !Directory.Exists(dirPath))
                {
                    Console.WriteLine($"创建目录: {dirPath}");
                    Directory.CreateDirectory(dirPath);
                }
                
                string json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                await File.WriteAllTextAsync(_settingsPath, json);
                Console.WriteLine($"设置已保存到 {_settingsPath}");
                SettingsChanged?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"异步保存设置失败: {ex.Message}");
                try {
                    // 尝试使用同步方法保存，作为后备
                    string json = JsonConvert.SerializeObject(_settings, Formatting.Indented);
                    File.WriteAllText(_settingsPath, json);
                    Console.WriteLine($"使用同步方法保存设置成功");
                    SettingsChanged?.Invoke(this, EventArgs.Empty);
                }
                catch (Exception syncEx) {
                    Console.WriteLine($"同步方法保存设置也失败: {syncEx.Message}");
                }
            }
        }
        
        // 直接更新整个settings对象，用于接收从JavaScript传来的设置
        public async Task UpdateSettingsFromJsAsync(Settings newSettings)
        {
            if (newSettings != null)
            {
                _settings = newSettings;
                await SaveSettingsAsync();
                Console.WriteLine("已从JavaScript更新设置");
            }
            else
            {
                Console.WriteLine("从JavaScript收到的设置为null，未更新");
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