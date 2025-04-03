using System;

namespace SnippetButler
{
    internal class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                // 创建并运行应用程序
                App app = new App();
                app.InitializeComponent();
                app.Run();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"应用程序启动失败: {ex.Message}");
            }
        }
    }
} 