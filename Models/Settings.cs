using Newtonsoft.Json;

namespace SnippetButler.Models
{
    public class Settings
    {
        [JsonProperty("hotkey")]
        public string Hotkey { get; set; } = "Control+Shift+Space";
        
        [JsonProperty("autoHide")]
        public bool AutoHide { get; set; } = true;
        
        [JsonProperty("alwaysOnTop")]
        public bool AlwaysOnTop { get; set; } = true;
        
        [JsonProperty("scripts")]
        public ScriptSettings Scripts { get; set; } = new ScriptSettings();
    }
    
    public class ScriptSettings
    {
        [JsonProperty("easy-window-dragging")]
        public bool EasyWindowDragging { get; set; } = false;
        
        [JsonProperty("on-screen-keyboard")]
        public bool OnScreenKeyboard { get; set; } = false;
    }
} 