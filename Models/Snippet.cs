using System;
using Newtonsoft.Json;

namespace SnippetButler.Models
{
    public class Snippet
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonProperty("content")]
        public string Content { get; set; } = string.Empty;
        
        [JsonProperty("creationDate")]
        public DateTime CreationDate { get; set; } = DateTime.Now;
        
        [JsonProperty("lastUsedDate")]
        public DateTime? LastUsedDate { get; set; }
        
        [JsonIgnore]
        public string GroupName { get; set; } = string.Empty;
        
        public Snippet() { }
        
        public Snippet(string name, string content, string groupName)
        {
            Name = name;
            Content = content;
            GroupName = groupName;
            CreationDate = DateTime.Now;
        }
    }
} 