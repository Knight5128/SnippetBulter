using System;
using System.Runtime.InteropServices;
using System.Windows.Input;
using System.Windows.Threading;
using SnippetButler.Models;

namespace SnippetButler.Services
{
    public class EasyWindowDraggingService
    {
        private readonly SettingsService _settingsService;
        private readonly DispatcherTimer _timer;
        private bool _isEnabled = false;
        private bool _isDragging = false;
        private IntPtr _draggedWindow = IntPtr.Zero;
        private int _lastX;
        private int _lastY;
        
        // Win32 API引入
        [DllImport("user32.dll")]
        private static extern IntPtr WindowFromPoint(POINT Point);
        
        [DllImport("user32.dll")]
        private static extern bool GetCursorPos(out POINT lpPoint);
        
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        
        [DllImport("user32.dll")]
        private static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
        
        [DllImport("user32.dll")]
        private static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
        
        [DllImport("kernel32.dll")]
        private static extern int GetCurrentProcessId();
        
        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int X;
            public int Y;
        }
        
        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }
        
        public EasyWindowDraggingService(SettingsService settingsService)
        {
            _settingsService = settingsService;
            _settingsService.SettingsChanged += SettingsService_SettingsChanged;
            
            // 创建定时器用于检测鼠标移动
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(10) // 10ms检测一次
            };
            _timer.Tick += Timer_Tick;
            
            // 根据设置决定是否启用
            UpdateState();
        }
        
        private void SettingsService_SettingsChanged(object? sender, EventArgs e)
        {
            UpdateState();
        }
        
        private void UpdateState()
        {
            bool shouldBeEnabled = _settingsService.CurrentSettings.Scripts.EasyWindowDragging;
            
            if (shouldBeEnabled != _isEnabled)
            {
                if (shouldBeEnabled)
                {
                    StartDraggingService();
                }
                else
                {
                    StopDraggingService();
                }
            }
        }
        
        private void StartDraggingService()
        {
            if (!_isEnabled)
            {
                _isEnabled = true;
                // 注册全局鼠标钩子
                HookManager.MouseDown += HookManager_MouseDown;
                HookManager.MouseUp += HookManager_MouseUp;
                HookManager.Install(); // 安装钩子
                Console.WriteLine("窗口拖拽服务已启动");
            }
        }
        
        private void StopDraggingService()
        {
            if (_isEnabled)
            {
                _isEnabled = false;
                _timer.Stop();
                _isDragging = false;
                
                // 取消注册事件
                HookManager.MouseDown -= HookManager_MouseDown;
                HookManager.MouseUp -= HookManager_MouseUp;
                HookManager.Uninstall(); // 卸载钩子
                Console.WriteLine("窗口拖拽服务已停止");
            }
        }
        
        private void HookManager_MouseDown(object? sender, System.Windows.Input.MouseEventArgs e)
        {
            // Only process when Alt key is pressed
            if (!_isEnabled || !Keyboard.IsKeyDown(Key.LeftAlt) || e.LeftButton != MouseButtonState.Pressed)
                return;
            
            // 获取鼠标位置
            if (GetCursorPos(out POINT point))
            {
                // 获取鼠标下的窗口
                IntPtr hWnd = WindowFromPoint(point);
                
                // 不拖拽自己的窗口
                GetWindowThreadProcessId(hWnd, out int processId);
                if (processId == GetCurrentProcessId())
                    return;
                
                if (hWnd != IntPtr.Zero)
                {
                    _isDragging = true;
                    _draggedWindow = hWnd;
                    _lastX = point.X;
                    _lastY = point.Y;
                    
                    // 激活窗口
                    SetForegroundWindow(hWnd);
                    
                    // 启动定时器检测鼠标移动
                    _timer.Start();
                }
            }
        }
        
        private void HookManager_MouseUp(object? sender, System.Windows.Input.MouseEventArgs e)
        {
            if (_isDragging && e.LeftButton == MouseButtonState.Released)
            {
                _isDragging = false;
                _timer.Stop();
            }
        }
        
        private void Timer_Tick(object? sender, EventArgs e)
        {
            if (!_isDragging || _draggedWindow == IntPtr.Zero)
            {
                _timer.Stop();
                return;
            }
            
            // 获取当前鼠标位置
            if (GetCursorPos(out POINT currentPoint))
            {
                // 计算偏移量
                int deltaX = currentPoint.X - _lastX;
                int deltaY = currentPoint.Y - _lastY;
                
                if (deltaX != 0 || deltaY != 0)
                {
                    // 获取窗口当前位置和大小
                    if (GetWindowRect(_draggedWindow, out RECT rect))
                    {
                        int width = rect.Right - rect.Left;
                        int height = rect.Bottom - rect.Top;
                        int newX = rect.Left + deltaX;
                        int newY = rect.Top + deltaY;
                        
                        // 移动窗口
                        MoveWindow(_draggedWindow, newX, newY, width, height, true);
                    }
                    
                    // 更新上次位置
                    _lastX = currentPoint.X;
                    _lastY = currentPoint.Y;
                }
            }
        }
    }
    
    // 使用SetWindowsHookEx API实现的全局钩子管理器
    public static class HookManager
    {
        // 鼠标事件委托
        public static event EventHandler<System.Windows.Input.MouseEventArgs>? MouseDown;
        public static event EventHandler<System.Windows.Input.MouseEventArgs>? MouseUp;
        
        // Windows钩子常量
        private const int WH_MOUSE_LL = 14;
        private const int WM_LBUTTONDOWN = 0x0201;
        private const int WM_LBUTTONUP = 0x0202;
        
        // 鼠标钩子回调委托
        private static LowLevelMouseProc? _mouseProc;
        
        // 钩子句柄
        private static IntPtr _mouseHookHandle = IntPtr.Zero;
        
        // 委托保持引用，防止垃圾回收
        private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);
        
        // Win32 API导入
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);
        
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);
        
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
        
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);
        
        [StructLayout(LayoutKind.Sequential)]
        private struct MSLLHOOKSTRUCT
        {
            public POINT pt;
            public uint mouseData;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }
        
        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int x;
            public int y;
        }
        
        // 安装钩子
        public static void Install()
        {
            if (_mouseHookHandle == IntPtr.Zero)
            {
                _mouseProc = MouseHookCallback;
                _mouseHookHandle = SetHook(_mouseProc);
            }
        }
        
        // 卸载钩子
        public static void Uninstall()
        {
            if (_mouseHookHandle != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_mouseHookHandle);
                _mouseHookHandle = IntPtr.Zero;
                _mouseProc = null;
            }
        }
        
        // 设置钩子
        private static IntPtr SetHook(LowLevelMouseProc proc)
        {
            using (var curProcess = System.Diagnostics.Process.GetCurrentProcess())
            using (var curModule = curProcess.MainModule)
            {
                return SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(curModule?.ModuleName ?? string.Empty), 0);
            }
        }
        
        // 钩子回调函数
        private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            // 如果nCode小于0，必须调用CallNextHookEx
            if (nCode >= 0)
            {
                // 解析MSLLHOOKSTRUCT结构体
                MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT))!;
                
                // 根据消息类型触发事件
                switch ((int)wParam)
                {
                    case WM_LBUTTONDOWN:
                        // 创建鼠标按下事件
                        MouseDown?.Invoke(null, CreateMouseEventArgs(MouseButtonState.Pressed, hookStruct.pt));
                        break;
                    
                    case WM_LBUTTONUP:
                        // 创建鼠标释放事件
                        MouseUp?.Invoke(null, CreateMouseEventArgs(MouseButtonState.Released, hookStruct.pt));
                        break;
                }
            }
            
            // 调用下一个钩子
            return CallNextHookEx(_mouseHookHandle, nCode, wParam, lParam);
        }
        
        // 创建MouseEventArgs事件参数
        private static System.Windows.Input.MouseEventArgs CreateMouseEventArgs(MouseButtonState buttonState, POINT pt)
        {
            var device = System.Windows.Input.Mouse.PrimaryDevice;
            var args = new System.Windows.Input.MouseButtonEventArgs(device, 0, MouseButton.Left);
            args.RoutedEvent = buttonState == MouseButtonState.Pressed ? Mouse.MouseDownEvent : Mouse.MouseUpEvent;
            return args;
        }
    }
} 