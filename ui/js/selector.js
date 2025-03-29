// 片段选择器 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从AHK获取数据
    requestDataFromAHK();
    
    // 设置搜索框事件
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', filterSnippets);
    }
    
    // 设置键盘事件
    document.addEventListener('keydown', function(e) {
        // ESC键关闭窗口
        if (e.key === 'Escape') {
            window.chrome.webview.postMessage({
                action: 'close'
            });
        }
    });
});

// 从AHK请求数据
function requestDataFromAHK() {
    try {
        window.chrome.webview.postMessage({
            action: 'getData'
        });
    } catch (error) {
        console.error('无法发送消息到AHK:', error);
        showError('无法与主程序通信，请重新启动应用');
    }
}

// 接收来自AHK的数据
window.receiveData = function(data) {
    try {
        snippetsData = data.snippets || {};
        settings = data.settings || {};
        
        // 渲染片段
        renderSnippets();
    } catch (error) {
        console.error('处理数据时出错:', error);
        showError('处理数据时出错');
    }
};

// 渲染片段列表
function renderSnippets() {
    const container = document.getElementById('snippetsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const searchTerm = document.getElementById('searchBox')?.value?.toLowerCase() || '';
    let hasVisibleSnippets = false;
    
    // 遍历分组
    for (const groupName in snippetsData) {
        // 创建分组元素
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.dataset.group = groupName;
        
        // 创建分组标题
        const headerDiv = document.createElement('div');
        headerDiv.className = 'group-header';
        headerDiv.textContent = groupName;
        headerDiv.addEventListener('click', toggleGroup);
        
        // 创建分组内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'group-content';
        
        // 获取分组内容
        const group = snippetsData[groupName];
        let hasVisibleSnippet = false;
        
        // 遍历分组内的片段
        for (const snippetName in group) {
            const snippetContent = group[snippetName];
            
            // 如果有搜索词，根据搜索词筛选
            if (searchTerm && !snippetName.toLowerCase().includes(searchTerm) && 
                !snippetContent.toLowerCase().includes(searchTerm)) {
                continue;
            }
            
            hasVisibleSnippet = true;
            hasVisibleSnippets = true;
            
            // 创建片段项
            const snippetDiv = document.createElement('div');
            snippetDiv.className = 'snippet-item';
            snippetDiv.dataset.name = snippetName;
            snippetDiv.dataset.content = snippetContent;
            snippetDiv.addEventListener('dblclick', copySnippet);
            
            // 创建片段名称
            const nameDiv = document.createElement('div');
            nameDiv.className = 'snippet-name';
            nameDiv.textContent = snippetName;
            
            // 创建片段内容预览
            const previewDiv = document.createElement('div');
            previewDiv.className = 'snippet-content';
            previewDiv.textContent = snippetContent.substring(0, 100) + 
                                     (snippetContent.length > 100 ? '...' : '');
            
            // 组装片段项
            snippetDiv.appendChild(nameDiv);
            snippetDiv.appendChild(previewDiv);
            contentDiv.appendChild(snippetDiv);
        }
        
        // 如果分组中有可见片段才添加到容器
        if (hasVisibleSnippet) {
            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(contentDiv);
            container.appendChild(groupDiv);
            
            // 如果有搜索词，默认展开分组
            if (searchTerm) {
                groupDiv.classList.add('expanded');
            }
        }
    }
    
    // 如果没有匹配的片段
    if (!hasVisibleSnippets) {
        const noResults = document.createElement('div');
        noResults.className = 'hint';
        noResults.textContent = searchTerm ? 
            `没有找到匹配 "${searchTerm}" 的片段` : 
            '没有可用的片段，请在管理面板中添加';
            
        container.appendChild(noResults);
    }
}

// 切换分组展开/折叠
function toggleGroup(e) {
    const groupDiv = e.currentTarget.parentNode;
    groupDiv.classList.toggle('expanded');
}

// 根据搜索词过滤片段
function filterSnippets() {
    renderSnippets();
}

// 复制片段到剪贴板
function copySnippet(e) {
    const snippetDiv = e.currentTarget;
    const content = snippetDiv.dataset.content;
    
    try {
        // 发送消息到AHK复制内容
        window.chrome.webview.postMessage({
            action: 'copySnippet',
            content: content,
            autoHide: settings.autoHide || false
        });
        
        // 显示复制成功提示
        const originalBackground = snippetDiv.style.backgroundColor;
        snippetDiv.style.backgroundColor = '#d4edda';
        
        setTimeout(() => {
            snippetDiv.style.backgroundColor = originalBackground;
        }, 500);
    } catch (error) {
        console.error('复制片段时出错:', error);
        showError('无法复制片段');
    }
}

// 显示错误信息
function showError(message) {
    const container = document.getElementById('snippetsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message">
            <div class="error-icon">⚠️</div>
            <div class="error-text">${message}</div>
        </div>
    `;
} 