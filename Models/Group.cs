using System.Collections.Generic;
using Newtonsoft.Json;

namespace SnippetButler.Models
{
    public class Group
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonProperty("snippets")]
        public Dictionary<string, string> Snippets { get; set; } = new Dictionary<string, string>();
        
        [JsonProperty("order")]
        public int Order { get; set; }
        
        public Group() { }
        
        public Group(string name)
        {
            Name = name;
            Snippets = new Dictionary<string, string>();
        }
    }
} 