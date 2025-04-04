// 片段选择器 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};
let searchTimeout;

// 文档就绪后执行
$(document).ready(function() {
    // 初始化
    initialize();
    
    // 设置搜索框事件处理
    $("#searchBox").on("input", function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            renderSnippets();
        }, 300);
    });
    
    // 监听键盘事件
    $(document).on("keydown", function(event) {
        // 如果按下Escape键，并且settings.autoHide为true，则关闭窗口
        if (event.key === "Escape" && settings.autoHide) {
            hideWindow();
        }
    });
});

// 初始化
function initialize() {
    // 使用全局store对象获取数据
    if (window.store && window.store.devMode) {
        // 开发模式下直接渲染数据
        snippetsData = window.store.snippetsData;
        settings = window.store.settings;
        renderSnippets();
        $("#loading").hide();
        $("#snippetsContainer").show();
    } else if (window.chrome && window.chrome.webview) {
        // 在正常模式下请求数据
        window.chrome.webview.addEventListener('message', handleMessage);
        requestDataFromAHK();
    } else {
        // 如果没有store且没有webview，尝试开发模式
        console.log("无法访问store或webview，尝试开发模式");
        // 创建一些默认数据用于测试
        snippetsData = {
            "常用": {
                "测试片段": "这是一个测试片段，因为无法加载实际数据。"
            }
        };
        settings = { autoHide: true };
        renderSnippets();
        $("#loading").hide();
        $("#snippetsContainer").show();
        showError("无法连接到数据源，使用测试数据");
    }
}

// 处理来自AHK的消息
function handleMessage(event) {
    const message = event.data;
    
    if (message.data) {
        // 接收到片段数据
        snippetsData = message.data;
        renderSnippets();
        $("#loading").hide();
        $("#snippetsContainer").show();
    }
    
    if (message.settings) {
        // 接收到设置数据
        settings = message.settings;
    }
}

// 从AHK请求数据
function requestDataFromAHK() {
    try {
        window.chrome.webview.postMessage({
            action: 'getData'
        });
    } catch (error) {
        console.error('无法发送消息到AHK:', error);
        showError('无法与主程序通信，请重启应用');
    }
}

// 渲染片段列表
function renderSnippets() {
    const searchText = $("#searchBox").val().toLowerCase();
    const container = $("#snippetsContainer");
    container.empty();
    
    let foundSnippets = false;
    let filteredGroups = {};
    
    // 过滤匹配的片段
    for (const groupName in snippetsData) {
        const group = snippetsData[groupName];
        
        // 检查这个分组中是否有匹配的片段
        let groupHasMatch = false;
        const matchedSnippets = {};
        
        for (const snippetName in group) {
            if (!searchText || 
                snippetName.toLowerCase().includes(searchText) || 
                group[snippetName].toLowerCase().includes(searchText)) {
                groupHasMatch = true;
                foundSnippets = true;
                matchedSnippets[snippetName] = group[snippetName];
            }
        }
        
        if (groupHasMatch) {
            filteredGroups[groupName] = matchedSnippets;
        }
    }
    
    // 显示过滤后的片段
    if (foundSnippets) {
        for (const groupName in filteredGroups) {
            const groupDiv = $("<div></div>");
            const groupHeader = $("<div class='group-title'></div>").text(groupName);
            const snippetList = $("<div class='snippet-list'></div>");
            
            for (const snippetName in filteredGroups[groupName]) {
                const snippetContent = filteredGroups[groupName][snippetName];
                const snippetItem = $("<div class='snippet-item'></div>")
                    .text(snippetName)
                    .attr("data-name", snippetName)
                    .attr("data-content", snippetContent)
                    .on("click", copySnippet);
                
                snippetList.append(snippetItem);
            }
            
            groupDiv.append(groupHeader, snippetList);
            container.append(groupDiv);
        }
    } else {
        // 如果没有找到匹配的片段
        if (searchText) {
            container.html("<div class='no-snippets'>没有找到匹配的片段</div>");
        } else {
            container.html("<div class='no-snippets'>没有可用的片段</div>");
        }
    }
}

// 复制片段到剪贴板
function copySnippet() {
    const $snippet = $(this);
    const snippetName = $snippet.attr('data-name');
    const snippetContent = $snippet.attr('data-content');
    
    // 使用全局store模块复制
    if (window.store) {
        window.store.copySnippet(snippetContent)
            .then(() => {
                showToast(`已复制: ${snippetName}`);
                // 如果设置了自动隐藏，则关闭窗口
                if (settings.autoHide) {
                    setTimeout(hideWindow, 500);
                }
            })
            .catch(error => {
                console.error('复制失败:', error);
                showToast('复制失败');
            });
    } else {
        // 如果store不可用，尝试使用备用方法
        try {
            navigator.clipboard.writeText(snippetContent)
                .then(() => {
                    showToast(`已复制: ${snippetName}`);
                    if (settings.autoHide) {
                        setTimeout(hideWindow, 500);
                    }
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    showToast('复制失败');
                });
        } catch (error) {
            console.error('复制操作失败:', error);
            showToast('复制失败');
        }
    }
}

// 隐藏窗口
function hideWindow() {
    try {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
                action: 'hideWindow'
            });
        }
    } catch (error) {
        console.warn('无法发送隐藏窗口命令:', error);
    }
}

// 显示错误提示
function showError(message) {
    console.error(message);
    
    // 创建或更新Toast提示
    const toastHtml = `
    <div class="toast-container position-fixed top-0 end-0 p-3">
        <div id="errorToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-danger text-white">
                <strong class="me-auto">错误</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    </div>`;
    
    // 移除可能存在的旧Toast
    $('.toast-container').remove();
    
    // 添加新Toast
    $('body').append(toastHtml);
    
    // 显示Toast
    const toastEl = $('#errorToast');
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
}

// 显示成功提示
function showToast(message) {
    // 创建或更新Toast提示
    const toastHtml = `
    <div class="toast-container position-fixed top-0 end-0 p-3">
        <div id="successToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-success text-white">
                <strong class="me-auto">成功</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    </div>`;
    
    // 移除可能存在的旧Toast
    $('.toast-container').remove();
    
    // 添加新Toast
    $('body').append(toastHtml);
    
    // 显示Toast
    const toastEl = $('#successToast');
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
} 