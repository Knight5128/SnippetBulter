// 片段选择器 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};

// 文档就绪后初始化
$(document).ready(function() {
    // 初始化
    initialize();
    
    // 设置搜索框事件
    $('#search-input').on('input', filterSnippets);
    
    // 设置键盘事件
    $(document).on('keydown', function(e) {
        // ESC键关闭窗口
        if (e.key === 'Escape') {
            try {
                window.chrome.webview.postMessage({
                    action: 'close'
                });
            } catch (error) {
                console.error('无法发送关闭消息:', error);
            }
        }
    });
});

// 初始化函数
function initialize() {
    // 请求数据
    requestDataFromAHK();
    
    // 如果5秒后仍未收到数据，显示错误
    setTimeout(function() {
        if ($.isEmptyObject(snippetsData)) {
            showError('无法从应用程序获取数据，请重新启动应用');
        }
    }, 5000);
}

// 从AHK请求数据
function requestDataFromAHK() {
    try {
        window.chrome.webview.postMessage({
            action: 'getData'
        });
    } catch (error) {
        console.error('无法发送消息到AHK:', error);
        showError('无法与主程序通信，请重新启动应用');
        
        // 开发时使用的测试数据
        useDummyData();
    }
}

// 使用测试数据(开发时使用)
function useDummyData() {
    snippetsData = {
        "常用": {
            "问候语": "您好，感谢您的来信。",
            "签名": "此致,\n敬礼\n张三"
        },
        "代码": {
            "HTML模板": "<!DOCTYPE html>\n<html>\n<head>\n  <title>标题</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>",
            "AHK函数": "MyFunction() {\n  MsgBox(\"Hello World\")\n  return true\n}"
        },
        "邮件模板": {
            "会议邀请": "主题：项目讨论会议邀请\n\n尊敬的团队成员：\n\n我们将于本周五下午2点在会议室A举行项目进度讨论会，请准时参加。",
            "工作汇报": "主题：周工作汇报\n\n尊敬的领导：\n\n本周我主要完成了以下工作：\n1. 项目A的需求分析\n2. 项目B的测试计划编写\n3. 与客户C进行了沟通\n\n下周计划：\n1. 完成项目A的设计文档\n2. 开始项目B的单元测试\n\n此致"
        }
    };
    
    settings = {
        "hotkey": "^+Space",
        "autoHide": true,
        "alwaysOnTop": true
    };
    
    renderSnippets();
}

// 接收来自AHK的数据
window.receiveData = function(data) {
    snippetsData = data.snippets || {};
    settings = data.settings || {};
    
    // 渲染片段
    renderSnippets();
};

// 渲染片段列表
function renderSnippets() {
    const $container = $('#snippets-container');
    $container.empty();
    
    const searchTerm = $('#search-input').val().toLowerCase();
    let hasVisibleSnippets = false;
    
    // 遍历分组
    $.each(snippetsData, function(groupName, group) {
        // 检查是否有匹配的片段
        let hasMatchingSnippets = false;
        
        if (!searchTerm) {
            hasMatchingSnippets = true;
        } else {
            // 检查分组名称
            if (groupName.toLowerCase().includes(searchTerm)) {
                hasMatchingSnippets = true;
            } else {
                // 检查片段
                $.each(group, function(snippetName, snippetContent) {
                    if (snippetName.toLowerCase().includes(searchTerm) || 
                        snippetContent.toLowerCase().includes(searchTerm)) {
                        hasMatchingSnippets = true;
                        return false; // 跳出循环
                    }
                });
            }
        }
        
        if (hasMatchingSnippets) {
            hasVisibleSnippets = true;
            
            // 创建分组
            const $group = $('<div>').addClass('mb-3');
            
            // 分组标题
            const $groupHeader = $('<div>')
                .addClass('group-card')
                .attr('data-group', groupName)
                .html(`
                    ${groupName}
                    <i class="toggle-icon bi bi-chevron-down"></i>
                `);
            
            // 分组内容容器
            const $groupContent = $('<div>').addClass('group-content');
            
            // 处理分组内的片段
            $.each(group, function(snippetName, snippetContent) {
                // 如果有搜索词，检查片段是否匹配
                if (searchTerm && 
                    !snippetName.toLowerCase().includes(searchTerm) && 
                    !snippetContent.toLowerCase().includes(searchTerm) &&
                    !groupName.toLowerCase().includes(searchTerm)) {
                    return true; // 继续下一个
                }
                
                // 创建片段卡片
                const $snippet = $('<div>')
                    .addClass('snippet-card')
                    .attr('data-name', snippetName)
                    .attr('data-content', snippetContent);
                
                // 片段标题
                const $snippetTitle = $('<div>')
                    .addClass('snippet-title')
                    .text(snippetName);
                
                // 片段内容预览
                const $snippetContent = $('<div>')
                    .addClass('snippet-content')
                    .text(snippetContent);
                
                // 组装片段卡片
                $snippet.append($snippetTitle, $snippetContent);
                
                // 添加双击事件
                $snippet.on('dblclick', copySnippet);
                
                // 添加到分组内容
                $groupContent.append($snippet);
            });
            
            // 如果分组内有片段才添加到容器
            if ($groupContent.children().length > 0) {
                $group.append($groupHeader, $groupContent);
                $container.append($group);
                
                // 如果有搜索词，默认展开分组
                if (searchTerm) {
                    $group.addClass('group-expanded');
                }
                
                // 绑定分组点击事件
                $groupHeader.on('click', toggleGroup);
            }
        }
    });
    
    // 如果没有匹配的片段
    if (!hasVisibleSnippets) {
        const $noResults = $('<div>')
            .addClass('no-results')
            .text(searchTerm ? 
                `没有找到匹配 "${searchTerm}" 的片段` : 
                '没有可用的片段，请在管理面板中添加');
        
        $container.append($noResults);
    }
}

// 切换分组展开/折叠
function toggleGroup() {
    $(this).parent().toggleClass('group-expanded');
}

// 根据搜索词过滤片段
function filterSnippets() {
    renderSnippets();
}

// 复制片段到剪贴板
function copySnippet() {
    const $snippet = $(this);
    const content = $snippet.data('content');
    
    // 发送消息到AHK复制内容
    try {
        window.chrome.webview.postMessage({
            action: 'copySnippet',
            content: content,
            autoHide: settings.autoHide || false
        });
        
        // 显示复制成功动画
        $snippet.addClass('copy-animation');
        setTimeout(function() {
            $snippet.removeClass('copy-animation');
        }, 500);
    } catch (error) {
        console.error('无法发送复制消息:', error);
        showError('无法与主程序通信，复制功能不可用');
    }
}

// 显示错误信息
function showError(message) {
    $('#snippets-container').html(`
        <div class="alert alert-danger mt-3" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
        </div>
    `);
} 