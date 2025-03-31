// 管理面板 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};
let currentGroup = "";
let isEditing = false;
let currentSnippetName = "";

// 文档加载完成后执行
$(document).ready(function() {
    // 初始化
    initialize();
    
    // 导航栏点击事件
    $(".nav-item").on("click", function() {
        $(".nav-item").removeClass("active");
        $(this).addClass("active");
        
        const tabId = $(this).data("tab");
        $(".tab-content").removeClass("active");
        $(`#${tabId}`).addClass("active");
    });
    
    // 添加片段按钮点击事件
    $("#add-snippet").on("click", function() {
        clearSnippetForm();
        isEditing = false;
        
        // 检查是否已选择分组
        if (!currentGroup) {
            showToast("请先选择或创建一个分组");
            return;
        }
        
        // 填充分组下拉菜单
        updateGroupSelect();
        
        // 设置当前分组
        $("#snippet-group").val(currentGroup);
        
        // 显示模态框
        const snippetModal = new bootstrap.Modal(document.getElementById('snippet-modal'));
        snippetModal.show();
    });
    
    // 添加分组按钮点击事件
    $("#add-group").on("click", function() {
        $("#old-group-name").val("");
        $("#group-name").val("");
        $("#group-modal-title").text("添加分组");
        
        // 显示模态框
        const groupModal = new bootstrap.Modal(document.getElementById('group-modal'));
        groupModal.show();
    });
    
    // 保存片段按钮点击事件
    $("#save-snippet-btn").on("click", saveSnippet);
    
    // 保存分组按钮点击事件
    $("#save-group-btn").on("click", saveGroup);
    
    // 保存设置按钮点击事件
    $("#save-settings-btn").on("click", saveSettings);
});

// 初始化函数
function initialize() {
    // 使用store模块获取数据
    snippetsData = store.snippetsData;
    settings = store.settings;
    
    // 如果在开发模式下
    if (store.devMode) {
        // 添加开发模式标识
        $('body').append('<div class="position-fixed bottom-0 start-0 p-3"><span class="badge bg-warning">开发模式</span></div>');
        
        // 5秒后显示开发模式提示
        setTimeout(function() {
            if ($("#dev-mode-info").length) {
                const devModeModal = new bootstrap.Modal(document.getElementById('dev-mode-info'));
                devModeModal.show();
            }
        }, 5000);
        
        // 立即填充UI
        updateUI();
    } else {
        // 正常模式，添加消息处理器
        window.chrome.webview.addEventListener('message', handleMessage);
        
        // 请求数据
        requestDataFromAHK();
    }
}

// 处理来自AHK的消息
function handleMessage(event) {
    const message = event.data;
    
    if (message.data) {
        // 更新片段数据
        snippetsData = message.data;
        updateUI();
    }
    
    if (message.settings) {
        // 更新设置
        settings = message.settings;
        updateSettingsForm();
    }
}

// 请求数据
function requestDataFromAHK() {
    try {
        window.chrome.webview.postMessage({
            action: 'getData'
        });
    } catch (error) {
        console.warn('无法发送消息到AHK，切换到开发模式:', error);
    }
}

// 保存片段
function saveSnippet() {
    // 取消默认表单提交行为
    event.preventDefault();
    
    // 获取当前选择的分组
    const groupName = $("#snippet-group").val();
    if (!groupName) {
        showError("请选择一个分组");
        return;
    }
    
    // 获取片段名称和内容
    const snippetName = $("#snippet-name").val().trim();
    const snippetContent = $("#snippet-content").val();
    
    // 验证片段名称
    if (!snippetName) {
        showError("片段名称不能为空");
        return;
    }
    
    // 检查是否正在编辑现有片段
    if (isEditing) {
        // 如果当前分组与旧分组不同，则需要从旧分组中删除
        if (currentGroup !== groupName && snippetsData[currentGroup]) {
            delete snippetsData[currentGroup][currentSnippetName];
        }
        
        // 如果片段名称发生变化，需要删除旧名称的片段
        if (currentSnippetName !== snippetName && snippetsData[groupName]) {
            delete snippetsData[groupName][currentSnippetName];
        }
    } else {
        // 检查片段是否已存在
        if (snippetsData[groupName] && snippetsData[groupName][snippetName]) {
            showError(`片段 "${snippetName}" 已存在于分组 "${groupName}" 中`);
            return;
        }
    }
    
    // 确保分组存在
    if (!snippetsData[groupName]) {
        snippetsData[groupName] = {};
    }
    
    // 保存片段
    snippetsData[groupName][snippetName] = snippetContent;
    
    // 使用store模块保存
    store.saveSnippets(snippetsData)
        .then(() => {
            // 更新界面
            updateUI();
            
            // 更新当前分组
            currentGroup = groupName;
            
            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('snippet-modal')).hide();
            
            // 显示成功消息
            showToast(`片段 "${snippetName}" 已保存到分组 "${groupName}"`);
        })
        .catch(error => {
            console.error('保存片段失败:', error);
            showError('保存片段失败');
        });
}

// 保存分组
function saveGroup() {
    // 取消默认表单提交行为
    event.preventDefault();
    
    // 获取分组名称
    const groupName = $("#group-name").val().trim();
    
    // 验证分组名称
    if (!groupName) {
        showError("分组名称不能为空");
        return;
    }
    
    // 获取旧分组名称（如果在编辑）
    const oldGroupName = $("#old-group-name").val();
    
    // 如果是新分组，检查是否已存在
    if (!oldGroupName && snippetsData[groupName]) {
        showError(`分组 "${groupName}" 已存在`);
        return;
    }
    
    // 如果是重命名分组
    if (oldGroupName && oldGroupName !== groupName) {
        // 创建新分组，复制所有片段
        snippetsData[groupName] = {...snippetsData[oldGroupName]};
        
        // 删除旧分组
        delete snippetsData[oldGroupName];
        
        // 如果当前选中的是被重命名的分组，更新当前分组
        if (currentGroup === oldGroupName) {
            currentGroup = groupName;
        }
    } else if (!snippetsData[groupName]) {
        // 创建新的空分组
        snippetsData[groupName] = {};
    }
    
    // 使用store模块保存
    store.saveSnippets(snippetsData)
        .then(() => {
            // 更新界面
            updateUI();
            
            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('group-modal')).hide();
            
            // 显示成功消息
            showToast(oldGroupName ? `分组已重命名为 "${groupName}"` : `分组 "${groupName}" 已创建`);
        })
        .catch(error => {
            console.error('保存分组失败:', error);
            showError('保存分组失败');
        });
}

// 保存设置
function saveSettings() {
    // 取消默认表单提交行为
    event.preventDefault();
    
    // 获取设置表单的值
    const hotkey = $("#hotkey-input").val();
    const autoHide = $("#auto-hide").prop("checked");
    const alwaysOnTop = $("#always-on-top").prop("checked");
    const easyWindowDragging = $("#easy-window-dragging").prop("checked");
    const onScreenKeyboard = $("#on-screen-keyboard").prop("checked");
    
    // 更新设置对象
    settings = {
        hotkey: hotkey,
        autoHide: autoHide,
        alwaysOnTop: alwaysOnTop,
        scripts: {
            "easy-window-dragging": easyWindowDragging,
            "on-screen-keyboard": onScreenKeyboard
        }
    };
    
    // 使用store模块保存设置
    store.saveSettings(settings)
        .then(() => {
            showToast("设置已保存");
        })
        .catch(error => {
            console.error('保存设置失败:', error);
            showError('保存设置失败');
        });
}

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