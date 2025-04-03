using System;

namespace SnippetButler
{
    public static class AppExtensions
    {
        /// <summary>
        /// 获取应用程序服务实例
        /// </summary>
        /// <typeparam name="T">服务类型</typeparam>
        /// <returns>服务实例</returns>
        /// <exception cref="InvalidOperationException">找不到服务时抛出</exception>
        public static T GetService<T>(this App app) where T : class
        {
            // 根据类型获取相应服务
            if (typeof(T) == typeof(Services.SnippetManager))
            {
                return app.GetPrivateFieldValue("_snippetManager") as T
                    ?? throw new InvalidOperationException($"未找到服务: {typeof(T).Name}");
            }
            else if (typeof(T) == typeof(Services.SettingsService))
            {
                return app.GetPrivateFieldValue("_settingsService") as T
                    ?? throw new InvalidOperationException($"未找到服务: {typeof(T).Name}");
            }
            else if (typeof(T) == typeof(Services.ClipboardService))
            {
                return app.GetPrivateFieldValue("_clipboardService") as T
                    ?? throw new InvalidOperationException($"未找到服务: {typeof(T).Name}");
            }
            else if (typeof(T) == typeof(Services.WebViewService))
            {
                return app.GetPrivateFieldValue("_webViewService") as T
                    ?? throw new InvalidOperationException($"未找到服务: {typeof(T).Name}");
            }
            else if (typeof(T) == typeof(Services.HotkeyService))
            {
                return app.GetPrivateFieldValue("_hotkeyService") as T
                    ?? throw new InvalidOperationException($"未找到服务: {typeof(T).Name}");
            }
            else if (typeof(T) == typeof(Services.EasyWindowDraggingService))
            {
                // 懒加载窗口拖拽服务
                var service = app.GetPrivateFieldValue("_windowDraggingService") as T;
                if (service == null)
                {
                    service = Activator.CreateInstance(typeof(T), app.GetService<Services.SettingsService>()) as T;
                    app.SetPrivateFieldValue("_windowDraggingService", service);
                }
                return service ?? throw new InvalidOperationException($"未能创建服务: {typeof(T).Name}");
            }
            else if (typeof(T) == typeof(Services.OnScreenKeyboardService))
            {
                // 懒加载屏幕键盘服务
                var service = app.GetPrivateFieldValue("_onScreenKeyboardService") as T;
                if (service == null)
                {
                    service = Activator.CreateInstance(typeof(T), app.GetService<Services.SettingsService>()) as T;
                    app.SetPrivateFieldValue("_onScreenKeyboardService", service);
                }
                return service ?? throw new InvalidOperationException($"未能创建服务: {typeof(T).Name}");
            }
            
            throw new InvalidOperationException($"未知服务类型: {typeof(T).Name}");
        }
        
        /// <summary>
        /// 获取私有字段的值
        /// </summary>
        private static object? GetPrivateFieldValue(this object obj, string fieldName)
        {
            var field = obj.GetType().GetField(fieldName, 
                System.Reflection.BindingFlags.Instance | 
                System.Reflection.BindingFlags.NonPublic);
            
            return field?.GetValue(obj);
        }
        
        /// <summary>
        /// 设置私有字段的值
        /// </summary>
        private static void SetPrivateFieldValue(this object obj, string fieldName, object? value)
        {
            var field = obj.GetType().GetField(fieldName, 
                System.Reflection.BindingFlags.Instance | 
                System.Reflection.BindingFlags.NonPublic);
            
            field?.SetValue(obj, value);
        }
    }
} 