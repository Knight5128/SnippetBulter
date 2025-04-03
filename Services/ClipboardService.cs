using System;
using System.Threading.Tasks;
using System.Windows;

namespace SnippetButler.Services
{
    public class ClipboardService
    {
        public event EventHandler<string>? TextCopied;
        
        public ClipboardService()
        {
        }
        
        public bool CopyToClipboard(string text)
        {
            try
            {
                // 确保在UI线程上操作剪贴板
                return System.Windows.Application.Current.Dispatcher.Invoke(() =>
                {
                    try
                    {
                        System.Windows.Clipboard.SetText(text);
                        TextCopied?.Invoke(this, text);
                        return true;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"复制到剪贴板失败: {ex.Message}");
                        return false;
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"剪贴板操作失败: {ex.Message}");
                return false;
            }
        }
        
        public async Task<bool> CopyToClipboardAsync(string text)
        {
            return await Task.Run(() => CopyToClipboard(text));
        }
        
        public string? GetTextFromClipboard()
        {
            try
            {
                return System.Windows.Application.Current.Dispatcher.Invoke(() =>
                {
                    if (System.Windows.Clipboard.ContainsText())
                    {
                        return System.Windows.Clipboard.GetText();
                    }
                    return null;
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"从剪贴板获取文本失败: {ex.Message}");
                return null;
            }
        }
    }
} 