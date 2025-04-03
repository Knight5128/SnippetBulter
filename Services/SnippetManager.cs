using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using SnippetButler.Models;

namespace SnippetButler.Services
{
    public class SnippetManager
    {
        private readonly string _dataPath;
        private Dictionary<string, Group> _groups = new();
        
        // 为JSON序列化准备的快照数据
        private Dictionary<string, Dictionary<string, string>> _snippetsData = new();
        
        public event EventHandler? SnippetsChanged;
        
        public SnippetManager()
        {
            _dataPath = Path.Combine(
                Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory) ?? string.Empty,
                "AppData",
                "snippets.json");
                
            // 确保目录存在
            Directory.CreateDirectory(Path.GetDirectoryName(_dataPath) ?? string.Empty);
        }
        
        public bool LoadSnippets()
        {
            try
            {
                if (File.Exists(_dataPath))
                {
                    string json = File.ReadAllText(_dataPath);
                    _snippetsData = JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, string>>>(json) ??
                                    new Dictionary<string, Dictionary<string, string>>();
                    
                    // 转换为Group对象
                    _groups = new Dictionary<string, Group>();
                    foreach (var group in _snippetsData)
                    {
                        var newGroup = new Group(group.Key)
                        {
                            Snippets = group.Value
                        };
                        _groups.Add(group.Key, newGroup);
                    }
                    
                    return true;
                }
                
                // 如果文件不存在，创建默认数据
                CreateDefaultData();
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"加载片段数据失败: {ex.Message}");
                CreateDefaultData();
                return false;
            }
        }
        
        public async Task SaveSnippetsAsync()
        {
            try
            {
                // 更新快照数据
                _snippetsData = _groups.ToDictionary(
                    g => g.Key,
                    g => g.Value.Snippets);
                
                string json = JsonConvert.SerializeObject(_snippetsData, Formatting.Indented);
                await File.WriteAllTextAsync(_dataPath, json);
                SnippetsChanged?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"保存片段数据失败: {ex.Message}");
            }
        }
        
        public Dictionary<string, Dictionary<string, string>> GetAllSnippets()
        {
            return _snippetsData;
        }
        
        public bool TryGetSnippet(string groupName, string snippetName, out string content)
        {
            content = string.Empty;
            
            if (_groups.TryGetValue(groupName, out Group? group) && 
                group.Snippets.TryGetValue(snippetName, out string? snippetContent))
            {
                content = snippetContent;
                return true;
            }
            
            return false;
        }
        
        public bool AddGroup(string groupName)
        {
            if (string.IsNullOrWhiteSpace(groupName) || _groups.ContainsKey(groupName))
                return false;
            
            _groups[groupName] = new Group(groupName);
            _ = SaveSnippetsAsync();
            return true;
        }
        
        public bool RenameGroup(string oldName, string newName)
        {
            if (string.IsNullOrWhiteSpace(newName) || !_groups.TryGetValue(oldName, out Group? group))
                return false;
            
            _groups.Remove(oldName);
            group.Name = newName;
            _groups[newName] = group;
            
            _ = SaveSnippetsAsync();
            return true;
        }
        
        public bool DeleteGroup(string groupName)
        {
            if (!_groups.ContainsKey(groupName))
                return false;
            
            _groups.Remove(groupName);
            _ = SaveSnippetsAsync();
            return true;
        }
        
        public bool AddSnippet(string groupName, string snippetName, string content)
        {
            if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(snippetName))
                return false;
            
            if (!_groups.TryGetValue(groupName, out Group? group))
            {
                group = new Group(groupName);
                _groups[groupName] = group;
            }
            
            group.Snippets[snippetName] = content;
            _ = SaveSnippetsAsync();
            return true;
        }
        
        public bool UpdateSnippet(string groupName, string snippetName, string content)
        {
            return AddSnippet(groupName, snippetName, content);
        }
        
        public bool DeleteSnippet(string groupName, string snippetName)
        {
            if (!_groups.TryGetValue(groupName, out Group? group) || 
                !group.Snippets.ContainsKey(snippetName))
                return false;
            
            group.Snippets.Remove(snippetName);
            _ = SaveSnippetsAsync();
            return true;
        }
        
        private void CreateDefaultData()
        {
            _groups = new Dictionary<string, Group>
            {
                ["常用"] = new Group("常用")
                {
                    Snippets = new Dictionary<string, string>
                    {
                        ["问候语"] = "您好，感谢您的来信。",
                        ["签名"] = "此致,\n敬礼\n张三"
                    }
                },
                ["代码"] = new Group("代码")
                {
                    Snippets = new Dictionary<string, string>
                    {
                        ["HTML模板"] = "<!DOCTYPE html>\n<html>\n<head>\n  <title>标题</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
                        ["C#函数"] = "public void MyFunction()\n{\n    Console.WriteLine(\"Hello World\");\n}"
                    }
                },
                ["邮件模板"] = new Group("邮件模板")
                {
                    Snippets = new Dictionary<string, string>
                    {
                        ["会议邀请"] = "主题：项目讨论会议邀请\n\n尊敬的团队成员：\n\n我们将于本周五下午2点在会议室A举行项目进度讨论会，请准时参加。",
                        ["工作汇报"] = "主题：周工作汇报\n\n尊敬的领导：\n\n本周我主要完成了以下工作：\n1. 项目A的需求分析\n2. 项目B的测试计划编写\n\n下周计划：\n1. 完成项目A的设计文档\n2. 开始项目B的单元测试"
                    }
                }
            };
            
            _snippetsData = _groups.ToDictionary(
                g => g.Key,
                g => g.Value.Snippets);
            
            _ = SaveSnippetsAsync();
        }
    }
} 