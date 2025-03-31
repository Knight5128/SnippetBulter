// 管理面板 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};
let currentGroup = null;
let isRecordingHotkey = false;
let confirmCallback = null;

// 文档就绪后初始化
$(document).ready(function() {
    // 初始化
    initialize();
    
    // 初始化模态框
    initModals();
    
    // 初始化按钮事件
    initButtons();
    
    // 初始化拖放排序
    initSortable();
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

// 初始化模态框
function initModals() {
    // 片段模态框
    $('#save-snippet-btn').on('click', saveSnippet);
    
    // 分组模态框
    $('#save-group-btn').on('click', saveGroup);
    
    // 确认模态框
    $('#confirm-action-btn').on('click', function() {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        $('#confirm-modal').modal('hide');
    });
}

// 初始化按钮事件
function initButtons() {
    // 添加分组按钮
    $('#add-group-btn').on('click', function() {
        $('#group-modal-title').text('添加分组');
        $('#group-name').val('');
        $('#old-group-name').val('');
        $('#group-modal').modal('show');
    });
    
    // 添加片段按钮
    $('#add-snippet-btn').on('click', function() {
        if (!currentGroup) return;
        
        $('#snippet-modal-title').text('添加片段');
        $('#snippet-name').val('');
        $('#snippet-content').val('');
        $('#snippet-id').val('');
        $('#snippet-modal').modal('show');
    });
    
    // 重命名分组按钮
    $('#rename-group-btn').on('click', function() {
        if (!currentGroup) return;
        
        $('#group-modal-title').text('重命名分组');
        $('#group-name').val(currentGroup);
        $('#old-group-name').val(currentGroup);
        $('#group-modal').modal('show');
    });
    
    // 删除分组按钮
    $('#delete-group-btn').on('click', function() {
        if (!currentGroup) return;
        
        $('#confirm-modal-title').text('删除分组');
        $('#confirm-modal-body').text(`确定要删除分组 "${currentGroup}" 及其所有片段吗？此操作无法撤销。`);
        confirmCallback = () => deleteGroup(currentGroup);
        $('#confirm-modal').modal('show');
    });
    
    // 录制热键按钮
    $('#record-hotkey-btn').on('click', toggleHotkeyRecording);
    
    // 保存设置按钮
    $('#save-settings-btn').on('click', saveSettings);
    
    // 导出数据按钮
    $('#export-data-btn').on('click', exportData);
    
    // 导入数据按钮
    $('#import-data-btn').on('click', importData);
}

// 初始化拖放排序
function initSortable() {
    // 初始化分组排序
    $('.groups-sortable').sortable({
        items: '.list-group-item',
        placeholder: 'list-group-item-placeholder',
        update: function(event, ui) {
            // 保存新的分组顺序
            saveGroupsOrder();
        }
    });
    
    // 初始化片段排序
    $('.snippets-sortable').sortable({
        items: '.snippet-card',
        placeholder: 'snippet-card-placeholder',
        update: function(event, ui) {
            // 保存新的片段顺序
            saveSnippetsOrder(currentGroup);
        }
    });
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
        "alwaysOnTop": true,
        "scripts": {
            "easy-window-dragging": false,
            "on-screen-keyboard": false
        }
    };
    
    // 更新界面
    updateUI();
}

// 接收来自AHK的数据
window.receiveData = function(data) {
    snippetsData = data.snippets || {};
    settings = data.settings || {};
    
    // 更新界面
    updateUI();
};

// 更新界面
function updateUI() {
    // 渲染分组列表
    renderGroups();
    
    // 更新设置表单
    updateSettingsForm();
}

// 渲染分组列表
function renderGroups() {
    const $groupsList = $('#groups-list');
    $groupsList.empty();
    
    // 如果没有分组，显示提示
    if (Object.keys(snippetsData).length === 0) {
        $groupsList.html('<div class="text-center p-3 text-muted">没有分组，请点击添加分组按钮创建</div>');
        return;
    }
    
    // 添加所有分组
    $.each(snippetsData, function(groupName, group) {
        const $groupItem = $('<a>')
            .addClass('list-group-item list-group-item-action d-flex justify-content-between align-items-center')
            .attr('href', '#')
            .attr('data-group', groupName)
            .html(`
                ${groupName}
                <span class="badge bg-primary rounded-pill">${Object.keys(group).length}</span>
            `);
            
        // 如果是当前选中的分组，添加active类
        if (groupName === currentGroup) {
            $groupItem.addClass('active');
        }
        
        // 绑定点击事件
        $groupItem.on('click', function(e) {
            e.preventDefault();
            selectGroup(groupName);
        });
        
        $groupsList.append($groupItem);
    });
}

// 选择分组
function selectGroup(groupName) {
    currentGroup = groupName;
    
    // 更新分组列表样式
    $('.list-group-item').removeClass('active');
    $(`.list-group-item[data-group="${groupName}"]`).addClass('active');
    
    // 更新片段列表标题
    $('#current-group-name').text(groupName);
    
    // 启用添加片段按钮
    $('#add-snippet-btn').prop('disabled', false);
    
    // 渲染片段列表
    renderSnippets(groupName);
}

// 渲染片段列表
function renderSnippets(groupName) {
    const $snippetsList = $('#snippets-list');
    $snippetsList.empty();
    
    if (!snippetsData[groupName]) return;
    
    const group = snippetsData[groupName];
    const snippetNames = Object.keys(group);
    
    // 如果分组中没有片段，显示提示
    if (snippetNames.length === 0) {
        $snippetsList.html('<div class="text-center p-5 text-muted">该分组中没有片段，请点击添加片段按钮创建</div>');
        return;
    }
    
    // 添加所有片段
    $.each(group, function(snippetName, snippetContent) {
        // 创建片段卡片
        const $snippetCard = $('<div>')
            .addClass('snippet-card mb-3')
            .attr('data-name', snippetName);
            
        // 创建片段标题和操作按钮
        const $cardHeader = $('<div>')
            .addClass('d-flex justify-content-between align-items-center mb-2');
            
        const $snippetTitle = $('<h5>')
            .addClass('mb-0 text-primary')
            .text(snippetName);
            
        const $actionButtons = $('<div>')
            .addClass('btn-group btn-group-sm');
            
        // 编辑按钮
        const $editBtn = $('<button>')
            .addClass('btn btn-outline-secondary')
            .html('<i class="bi bi-pencil"></i>')
            .attr('title', '编辑')
            .on('click', function() {
                editSnippet(groupName, snippetName);
            });
            
        // 复制按钮
        const $copyBtn = $('<button>')
            .addClass('btn btn-outline-primary')
            .html('<i class="bi bi-clipboard"></i>')
            .attr('title', '复制')
            .on('click', function() {
                copySnippet(snippetContent);
            });
            
        // 删除按钮
        const $deleteBtn = $('<button>')
            .addClass('btn btn-outline-danger')
            .html('<i class="bi bi-trash"></i>')
            .attr('title', '删除')
            .on('click', function() {
                confirmDeleteSnippet(groupName, snippetName);
            });
            
        $actionButtons.append($editBtn, $copyBtn, $deleteBtn);
        $cardHeader.append($snippetTitle, $actionButtons);
        
        // 创建片段内容
        const $snippetContent = $('<div>')
            .addClass('snippet-content')
            .text(snippetContent);
            
        // 组装片段卡片
        $snippetCard.append($cardHeader, $snippetContent);
        $snippetsList.append($snippetCard);
    });
}

// 编辑片段
function editSnippet(groupName, snippetName) {
    $('#snippet-modal-title').text('编辑片段');
    $('#snippet-name').val(snippetName);
    $('#snippet-content').val(snippetsData[groupName][snippetName]);
    $('#snippet-id').val(snippetName);
    $('#snippet-modal').modal('show');
}

// 确认删除片段
function confirmDeleteSnippet(groupName, snippetName) {
    $('#confirm-modal-title').text('删除片段');
    $('#confirm-modal-body').text(`确定要删除片段 "${snippetName}" 吗？此操作无法撤销。`);
    confirmCallback = () => deleteSnippet(groupName, snippetName);
    $('#confirm-modal').modal('show');
}

// 删除片段
function deleteSnippet(groupName, snippetName) {
    try {
        window.chrome.webview.postMessage({
            action: 'deleteSnippet',
            group: groupName,
            name: snippetName
        });
        
        // 从本地数据中删除
        delete snippetsData[groupName][snippetName];
        
        // 更新界面
        renderSnippets(groupName);
    } catch (error) {
        console.error('删除片段时出错:', error);
        showError('无法删除片段，请重新启动应用');
    }
}

// 保存片段
function saveSnippet() {
    const snippetName = $('#snippet-name').val().trim();
    const snippetContent = $('#snippet-content').val();
    const oldName = $('#snippet-id').val().trim();
    
    if (!snippetName) {
        alert('片段名称不能为空!');
        return;
    }
    
    if (!currentGroup) {
        alert('请先选择一个分组!');
        return;
    }
    
    // 如果是编辑现有片段且名称已更改
    if (oldName && oldName !== snippetName) {
        // 如果新名称已存在
        if (snippetsData[currentGroup][snippetName]) {
            if (!confirm('片段名称已存在，是否覆盖?')) {
                return;
            }
        }
        
        // 删除旧片段
        delete snippetsData[currentGroup][oldName];
    } 
    // 添加新片段但名称已存在
    else if (!oldName && snippetsData[currentGroup][snippetName]) {
        if (!confirm('片段名称已存在，是否覆盖?')) {
            return;
        }
    }
    
    try {
        // 保存片段
        window.chrome.webview.postMessage({
            action: 'addSnippet',
            group: currentGroup,
            name: snippetName,
            content: snippetContent
        });
        
        // 更新本地数据
        snippetsData[currentGroup][snippetName] = snippetContent;
        
        // 关闭模态框并更新界面
        $('#snippet-modal').modal('hide');
        renderSnippets(currentGroup);
    } catch (error) {
        console.error('保存片段时出错:', error);
        showError('无法保存片段，请重新启动应用');
    }
}

// 保存分组
function saveGroup() {
    const groupName = $('#group-name').val().trim();
    const oldName = $('#old-group-name').val().trim();
    
    if (!groupName) {
        alert('分组名称不能为空!');
        return;
    }
    
    try {
        // 如果是编辑现有分组
        if (oldName && oldName !== groupName) {
            // 如果新名称已存在
            if (snippetsData[groupName]) {
                alert('分组名称已存在!');
                return;
            }
            
            window.chrome.webview.postMessage({
                action: 'renameGroup',
                oldName: oldName,
                newName: groupName
            });
            
            // 更新本地数据
            snippetsData[groupName] = snippetsData[oldName];
            delete snippetsData[oldName];
            
            // 更新当前选中的分组
            if (currentGroup === oldName) {
                currentGroup = groupName;
            }
        } 
        // 添加新分组
        else if (!oldName) {
            // 如果名称已存在
            if (snippetsData[groupName]) {
                alert('分组名称已存在!');
                return;
            }
            
            window.chrome.webview.postMessage({
                action: 'addGroup',
                name: groupName
            });
            
            // 更新本地数据
            snippetsData[groupName] = {};
        }
        
        // 关闭模态框并更新界面
        $('#group-modal').modal('hide');
        renderGroups();
        
        // 如果是新分组，自动选中它
        if (!oldName) {
            selectGroup(groupName);
        }
    } catch (error) {
        console.error('保存分组时出错:', error);
        showError('无法保存分组，请重新启动应用');
    }
}

// 删除分组
function deleteGroup(groupName) {
    try {
        window.chrome.webview.postMessage({
            action: 'deleteGroup',
            name: groupName
        });
        
        // 从本地数据中删除
        delete snippetsData[groupName];
        
        // 如果删除的是当前选中的分组，清除当前选中
        if (currentGroup === groupName) {
            currentGroup = null;
            $('#current-group-name').text('请选择一个分组');
            $('#add-snippet-btn').prop('disabled', true);
            $('#snippets-list').html('<div class="text-center p-5 text-muted">请选择一个分组以查看片段</div>');
        }
        
        // 更新界面
        renderGroups();
    } catch (error) {
        console.error('删除分组时出错:', error);
        showError('无法删除分组，请重新启动应用');
    }
}

// 复制片段到剪贴板
function copySnippet(content) {
    try {
        window.chrome.webview.postMessage({
            action: 'copySnippet',
            content: content
        });
        
        // 提示已复制
        showToast('片段已复制到剪贴板!');
    } catch (error) {
        console.error('复制片段时出错:', error);
        showError('无法复制片段，请重新启动应用');
    }
}

// 切换热键录制状态
function toggleHotkeyRecording() {
    const $button = $('#record-hotkey-btn');
    const $input = $('#hotkey-input');
    
    if (isRecordingHotkey) {
        // 停止录制
        $button.text('录制');
        $button.removeClass('btn-danger').addClass('btn-outline-secondary');
        $input.prop('placeholder', '点击录制热键组合');
        isRecordingHotkey = false;
        
        // 通知AHK停止热键录制
        try {
            window.chrome.webview.postMessage({
                action: 'stopRecordHotkey'
            });
        } catch (error) {
            console.error('停止热键录制时出错:', error);
        }
    } else {
        // 开始录制
        $button.text('停止');
        $button.removeClass('btn-outline-secondary').addClass('btn-danger');
        $input.val('');
        $input.prop('placeholder', '按下热键组合...');
        isRecordingHotkey = true;
        
        // 通知AHK开始热键录制
        try {
            window.chrome.webview.postMessage({
                action: 'startRecordHotkey'
            });
        } catch (error) {
            console.error('开始热键录制时出错:', error);
        }
    }
}

// 接收热键录制结果(从AHK调用)
window.setRecordedHotkey = function(hotkey) {
    $('#hotkey-input').val(hotkey);
    toggleHotkeyRecording(); // 停止录制状态
};

// 更新设置表单
function updateSettingsForm() {
    // 热键设置
    $('#hotkey-input').val(settings.hotkey || '^+Space');
    $('#current-hotkey').text(settings.hotkey || '^+Space');
    
    // 行为设置
    $('#auto-hide-switch').prop('checked', settings.autoHide || false);
    $('#always-on-top-switch').prop('checked', settings.alwaysOnTop || false);
    
    // 集成功能设置
    $('#easy-dragging-switch').prop('checked', settings.scripts && settings.scripts['easy-window-dragging'] || false);
    $('#on-screen-keyboard-switch').prop('checked', settings.scripts && settings.scripts['on-screen-keyboard'] || false);
}

// 保存设置
function saveSettings() {
    const hotkey = $('#hotkey-input').val().trim();
    const autoHide = $('#auto-hide-switch').prop('checked');
    const alwaysOnTop = $('#always-on-top-switch').prop('checked');
    const easyDragging = $('#easy-dragging-switch').prop('checked');
    const onScreenKeyboard = $('#on-screen-keyboard-switch').prop('checked');
    
    if (!hotkey) {
        alert('快捷键不能为空!');
        return;
    }
    
    try {
        // 更新本地设置
        settings.hotkey = hotkey;
        settings.autoHide = autoHide;
        settings.alwaysOnTop = alwaysOnTop;
        if (!settings.scripts) settings.scripts = {};
        settings.scripts['easy-window-dragging'] = easyDragging;
        settings.scripts['on-screen-keyboard'] = onScreenKeyboard;
        
        // 发送到AHK
        window.chrome.webview.postMessage({
            action: 'updateSettings',
            settings: settings
        });
        
        // 设置脚本状态
        window.chrome.webview.postMessage({
            action: 'toggleScript',
            name: 'easy-window-dragging',
            enabled: easyDragging
        });
        
        window.chrome.webview.postMessage({
            action: 'toggleScript',
            name: 'on-screen-keyboard',
            enabled: onScreenKeyboard
        });
        
        showToast('设置已保存!');
    } catch (error) {
        console.error('保存设置时出错:', error);
        showError('无法保存设置，请重新启动应用');
    }
}

// 保存分组顺序
function saveGroupsOrder() {
    // 获取新的顺序
    const newOrder = {};
    $('.list-group-item').each(function() {
        const groupName = $(this).data('group');
        if (groupName && snippetsData[groupName]) {
            newOrder[groupName] = snippetsData[groupName];
        }
    });
    
    // 如果有变化才保存
    if (Object.keys(newOrder).length > 0) {
        snippetsData = newOrder;
        
        try {
            window.chrome.webview.postMessage({
                action: 'saveData',
                snippets: snippetsData
            });
        } catch (error) {
            console.error('保存分组顺序时出错:', error);
        }
    }
}

// 保存片段顺序
function saveSnippetsOrder(groupName) {
    if (!groupName || !snippetsData[groupName]) return;
    
    // 获取新的顺序
    const newOrder = {};
    $('.snippet-card').each(function() {
        const snippetName = $(this).data('name');
        if (snippetName && snippetsData[groupName][snippetName]) {
            newOrder[snippetName] = snippetsData[groupName][snippetName];
        }
    });
    
    // 如果有变化才保存
    if (Object.keys(newOrder).length > 0) {
        snippetsData[groupName] = newOrder;
        
        try {
            window.chrome.webview.postMessage({
                action: 'saveData',
                snippets: snippetsData
            });
        } catch (error) {
            console.error('保存片段顺序时出错:', error);
        }
    }
}

// 导出数据
function exportData() {
    try {
        const dataStr = JSON.stringify({
            snippets: snippetsData,
            settings: settings
        }, null, 2);
        
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'snippets-backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    } catch (error) {
        console.error('导出数据时出错:', error);
        showError('无法导出数据，请重新启动应用');
    }
}

// 导入数据
function importData() {
    // 创建一个隐藏的文件输入框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function() {
        if (!fileInput.files || !fileInput.files[0]) return;
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.snippets) {
                    alert('无效的数据文件!');
                    return;
                }
                
                // 确认导入
                if (confirm('导入将覆盖当前所有数据，是否继续?')) {
                    snippetsData = data.snippets;
                    
                    // 可选：也导入设置
                    if (data.settings) {
                        settings = data.settings;
                    }
                    
                    // 保存到AHK
                    window.chrome.webview.postMessage({
                        action: 'saveData',
                        snippets: snippetsData,
                        settings: settings
                    });
                    
                    // 更新界面
                    updateUI();
                    
                    showToast('数据导入成功!');
                }
            } catch (error) {
                console.error('解析导入数据时出错:', error);
                alert('无效的数据文件格式!');
            }
        };
        
        reader.readAsText(file);
    };
    
    // 触发文件选择对话框
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// 显示错误信息
function showError(message) {
    alert(message);
}

// 显示提示消息
function showToast(message) {
    // 创建一个临时的toast
    const $toast = $(`
        <div class="toast align-items-center text-white bg-success border-0 position-fixed bottom-0 end-0 m-3" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `);
    
    $('body').append($toast);
    
    const toast = new bootstrap.Toast($toast, {
        delay: 3000
    });
    
    toast.show();
    
    // 自动移除元素
    $toast.on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

// 全局快捷键设置
document.addEventListener('DOMContentLoaded', function() {
    const enableHotkeyCheckbox = document.getElementById('enableGlobalHotkey');
    const hotkeySettings = document.querySelector('.hotkey-settings');
    const hotkeyInput = document.getElementById('globalHotkeyInput');
    const saveHotkeyBtn = document.getElementById('saveHotkey');
    
    // 从本地存储加载设置
    const savedHotkey = localStorage.getItem('globalHotkey');
    const isHotkeyEnabled = localStorage.getItem('hotkeyEnabled') === 'true';
    
    enableHotkeyCheckbox.checked = isHotkeyEnabled;
    hotkeySettings.style.display = isHotkeyEnabled ? 'flex' : 'none';
    if (savedHotkey) {
        hotkeyInput.value = savedHotkey;
    }
    
    // 处理启用/禁用快捷键
    enableHotkeyCheckbox.addEventListener('change', function() {
        hotkeySettings.style.display = this.checked ? 'flex' : 'none';
        localStorage.setItem('hotkeyEnabled', this.checked);
        
        // 通知后端
        window.chrome.webview.postMessage({
            type: 'toggleGlobalHotkey',
            enabled: this.checked,
            hotkey: hotkeyInput.value
        });
    });
    
    // 记录按键组合
    let currentKeys = new Set();
    hotkeyInput.addEventListener('keydown', function(e) {
        e.preventDefault();
        
        // 记录当前按下的修饰键
        if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') {
            currentKeys.add(e.key);
        } else {
            // 如果按下了其他键，组合所有当前按下的键
            let hotkeyStr = '';
            if (currentKeys.has('Control')) hotkeyStr += '^';
            if (currentKeys.has('Alt')) hotkeyStr += '!';
            if (currentKeys.has('Shift')) hotkeyStr += '+';
            hotkeyStr += e.key.toUpperCase();
            
            hotkeyInput.value = hotkeyStr;
        }
    });
    
    // 清除按键记录
    hotkeyInput.addEventListener('keyup', function(e) {
        if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') {
            currentKeys.delete(e.key);
        }
    });
    
    // 保存快捷键
    saveHotkeyBtn.addEventListener('click', function() {
        const hotkey = hotkeyInput.value;
        if (!hotkey) {
            alert('请先设置快捷键');
            return;
        }
        
        localStorage.setItem('globalHotkey', hotkey);
        
        // 通知后端
        window.chrome.webview.postMessage({
            type: 'setGlobalHotkey',
            hotkey: hotkey
        });
    });
}); 