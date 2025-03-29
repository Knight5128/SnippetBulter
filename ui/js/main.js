// 管理面板 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};
let currentGroup = null;
let deleteCallback = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Tab切换
    initTabNavigation();
    
    // 初始化模态框
    initModals();
    
    // 初始化按钮事件
    initButtons();
    
    // 从AHK获取数据
    requestDataFromAHK();
});

// 初始化标签页导航
function initTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有导航项的active类
            navItems.forEach(i => i.classList.remove('active'));
            
            // 移除所有内容页的active类
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // 添加当前项和对应内容页的active类
            this.classList.add('active');
            const tabId = this.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 初始化模态框
function initModals() {
    // 关闭分组模态框
    document.getElementById('closeGroupModal')?.addEventListener('click', () => {
        document.getElementById('groupModal').classList.remove('active');
    });
    document.getElementById('cancelGroupBtn')?.addEventListener('click', () => {
        document.getElementById('groupModal').classList.remove('active');
    });
    
    // 关闭片段模态框
    document.getElementById('closeSnippetModal')?.addEventListener('click', () => {
        document.getElementById('snippetModal').classList.remove('active');
    });
    document.getElementById('cancelSnippetBtn')?.addEventListener('click', () => {
        document.getElementById('snippetModal').classList.remove('active');
    });
    
    // 关闭确认删除模态框
    document.getElementById('closeConfirmModal')?.addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
    });
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('active');
    });
    
    // 保存分组
    document.getElementById('saveGroupBtn')?.addEventListener('click', saveGroup);
    
    // 保存片段
    document.getElementById('saveSnippetBtn')?.addEventListener('click', saveSnippet);
    
    // 确认删除
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
        if (typeof deleteCallback === 'function') {
            deleteCallback();
        }
        document.getElementById('confirmModal').classList.remove('active');
    });
}

// 初始化按钮事件
function initButtons() {
    // 添加分组按钮
    document.getElementById('addGroupBtn')?.addEventListener('click', () => {
        document.getElementById('groupModalTitle').textContent = '添加分组';
        document.getElementById('groupNameInput').value = '';
        document.getElementById('oldGroupName').value = '';
        document.getElementById('groupModal').classList.add('active');
    });
    
    // 添加片段按钮
    document.getElementById('addSnippetBtn')?.addEventListener('click', () => {
        if (!currentGroup) return;
        
        document.getElementById('snippetModalTitle').textContent = '添加片段';
        document.getElementById('snippetNameInput').value = '';
        document.getElementById('snippetContentInput').value = '';
        document.getElementById('oldSnippetName').value = '';
        document.getElementById('snippetModal').classList.add('active');
    });
    
    // 保存设置按钮
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
    
    // 保存脚本设置按钮
    document.getElementById('saveScriptsBtn')?.addEventListener('click', saveScriptSettings);
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
    }
}

// 接收来自AHK的数据
window.receiveData = function(data) {
    try {
        snippetsData = data.snippets || {};
        settings = data.settings || {};
        
        // 更新界面
        renderGroups();
        updateSettingsForm();
        updateScriptsForm();
    } catch (error) {
        console.error('处理数据时出错:', error);
        showError('处理数据时出错');
    }
};

// 渲染分组列表
function renderGroups() {
    const groupList = document.getElementById('groupList');
    if (!groupList) return;
    
    groupList.innerHTML = '';
    
    for (const groupName in snippetsData) {
        const li = document.createElement('li');
        li.className = 'group-item';
        if (currentGroup === groupName) {
            li.classList.add('active');
        }
        li.textContent = groupName;
        li.dataset.group = groupName;
        li.addEventListener('click', () => selectGroup(groupName));
        
        // 添加右键菜单事件
        li.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showGroupContextMenu(groupName, e.clientX, e.clientY);
        });
        
        groupList.appendChild(li);
    }
    
    // 如果没有分组
    if (Object.keys(snippetsData).length === 0) {
        const li = document.createElement('li');
        li.className = 'group-item';
        li.textContent = '没有分组，请点击添加按钮创建';
        groupList.appendChild(li);
    }
}

// 显示分组右键菜单
function showGroupContextMenu(groupName, x, y) {
    // 创建临时的右键菜单
    let contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.backgroundColor = 'white';
    contextMenu.style.border = '1px solid #ddd';
    contextMenu.style.borderRadius = '4px';
    contextMenu.style.padding = '5px 0';
    contextMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    contextMenu.style.zIndex = '1000';
    
    // 添加菜单项
    let renameItem = document.createElement('div');
    renameItem.style.padding = '8px 15px';
    renameItem.style.cursor = 'pointer';
    renameItem.textContent = '重命名';
    renameItem.addEventListener('mouseenter', () => renameItem.style.backgroundColor = '#f5f5f5');
    renameItem.addEventListener('mouseleave', () => renameItem.style.backgroundColor = 'transparent');
    renameItem.addEventListener('click', () => {
        document.body.removeChild(contextMenu);
        editGroup(groupName);
    });
    
    let deleteItem = document.createElement('div');
    deleteItem.style.padding = '8px 15px';
    deleteItem.style.cursor = 'pointer';
    deleteItem.textContent = '删除';
    deleteItem.addEventListener('mouseenter', () => deleteItem.style.backgroundColor = '#f5f5f5');
    deleteItem.addEventListener('mouseleave', () => deleteItem.style.backgroundColor = 'transparent');
    deleteItem.addEventListener('click', () => {
        document.body.removeChild(contextMenu);
        confirmDeleteGroup(groupName);
    });
    
    contextMenu.appendChild(renameItem);
    contextMenu.appendChild(deleteItem);
    
    // 添加到文档并设置自动关闭
    document.body.appendChild(contextMenu);
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        const closeMenu = function() {
            if (document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 0);
}

// 选择分组
function selectGroup(groupName) {
    currentGroup = groupName;
    
    // 更新分组列表样式
    document.querySelectorAll('.group-item').forEach(item => {
        if (item.dataset.group === groupName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 更新片段列表标题
    const titleElement = document.getElementById('currentGroupTitle');
    if (titleElement) {
        titleElement.textContent = groupName;
    }
    
    // 启用添加片段按钮
    const addButton = document.getElementById('addSnippetBtn');
    if (addButton) {
        addButton.disabled = false;
    }
    
    // 渲染片段列表
    renderSnippets(groupName);
}

// 渲染片段列表
function renderSnippets(groupName) {
    const snippetsList = document.getElementById('snippetsList');
    if (!snippetsList) return;
    
    snippetsList.innerHTML = '';
    
    if (!snippetsData[groupName]) return;
    
    const group = snippetsData[groupName];
    const snippetNames = Object.keys(group);
    
    if (snippetNames.length === 0) {
        const div = document.createElement('div');
        div.className = 'snippet-item';
        div.textContent = '该分组中没有片段，请点击添加片段按钮创建';
        snippetsList.appendChild(div);
        return;
    }
    
    for (const snippetName of snippetNames) {
        const snippetContent = group[snippetName];
        
        const snippetDiv = document.createElement('div');
        snippetDiv.className = 'snippet-item';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'snippet-header';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'snippet-title';
        titleDiv.textContent = snippetName;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'snippet-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', () => editSnippet(groupName, snippetName));
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn';
        copyBtn.textContent = '复制';
        copyBtn.addEventListener('click', () => copySnippet(snippetContent));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', () => confirmDeleteSnippet(groupName, snippetName));
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(deleteBtn);
        
        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(actionsDiv);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'snippet-content';
        contentDiv.textContent = snippetContent;
        
        snippetDiv.appendChild(headerDiv);
        snippetDiv.appendChild(contentDiv);
        
        snippetsList.appendChild(snippetDiv);
    }
}

// 编辑分组
function editGroup(groupName) {
    document.getElementById('groupModalTitle').textContent = '编辑分组';
    document.getElementById('groupNameInput').value = groupName;
    document.getElementById('oldGroupName').value = groupName;
    document.getElementById('groupModal').classList.add('active');
}

// 确认删除分组
function confirmDeleteGroup(groupName) {
    document.getElementById('confirmMessage').textContent = `您确定要删除分组 "${groupName}" 及其所有片段吗？此操作无法撤销。`;
    deleteCallback = () => deleteGroup(groupName);
    document.getElementById('confirmModal').classList.add('active');
}

// 删除分组
function deleteGroup(groupName) {
    try {
        window.chrome.webview.postMessage({
            action: 'deleteGroup',
            name: groupName
        });
        
        // 如果删除的是当前选中的分组，清除当前选中
        if (currentGroup === groupName) {
            currentGroup = null;
            document.getElementById('currentGroupTitle').textContent = '选择一个分组';
            document.getElementById('addSnippetBtn').disabled = true;
            document.getElementById('snippetsList').innerHTML = '<div class="snippet-item">请选择一个分组以查看片段</div>';
        }
        
        // 从本地数据中删除
        delete snippetsData[groupName];
        
        // 更新界面
        renderGroups();
    } catch (error) {
        console.error('删除分组时出错:', error);
        showError('删除分组失败');
    }
}

// 保存分组
function saveGroup() {
    const groupName = document.getElementById('groupNameInput').value.trim();
    const oldName = document.getElementById('oldGroupName').value.trim();
    
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
        document.getElementById('groupModal').classList.remove('active');
        renderGroups();
        
        // 如果是新分组，自动选中它
        if (!oldName) {
            selectGroup(groupName);
        }
    } catch (error) {
        console.error('保存分组时出错:', error);
        showError('保存分组失败');
    }
}

// 编辑片段
function editSnippet(groupName, snippetName) {
    document.getElementById('snippetModalTitle').textContent = '编辑片段';
    document.getElementById('snippetNameInput').value = snippetName;
    document.getElementById('snippetContentInput').value = snippetsData[groupName][snippetName];
    document.getElementById('oldSnippetName').value = snippetName;
    document.getElementById('snippetModal').classList.add('active');
}

// 确认删除片段
function confirmDeleteSnippet(groupName, snippetName) {
    document.getElementById('confirmMessage').textContent = `您确定要删除片段 "${snippetName}" 吗？此操作无法撤销。`;
    deleteCallback = () => deleteSnippet(groupName, snippetName);
    document.getElementById('confirmModal').classList.add('active');
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
        showError('删除片段失败');
    }
}

// 保存片段
function saveSnippet() {
    const snippetName = document.getElementById('snippetNameInput').value.trim();
    const snippetContent = document.getElementById('snippetContentInput').value;
    const oldName = document.getElementById('oldSnippetName').value.trim();
    
    if (!snippetName) {
        alert('片段名称不能为空!');
        return;
    }
    
    if (!currentGroup) {
        alert('请先选择一个分组!');
        return;
    }
    
    try {
        // 如果是编辑现有片段
        if (oldName && oldName !== snippetName) {
            // 如果新名称已存在
            if (snippetsData[currentGroup][snippetName]) {
                const confirm = window.confirm('片段名称已存在，是否覆盖?');
                if (!confirm) return;
            }
            
            // 删除旧片段
            delete snippetsData[currentGroup][oldName];
        } 
        // 添加新片段但名称已存在
        else if (!oldName && snippetsData[currentGroup][snippetName]) {
            const confirm = window.confirm('片段名称已存在，是否覆盖?');
            if (!confirm) return;
        }
        
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
        document.getElementById('snippetModal').classList.remove('active');
        renderSnippets(currentGroup);
    } catch (error) {
        console.error('保存片段时出错:', error);
        showError('保存片段失败');
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
        alert('片段已复制到剪贴板!');
    } catch (error) {
        console.error('复制片段时出错:', error);
        showError('复制片段失败');
    }
}

// 更新设置表单
function updateSettingsForm() {
    const hotkeyInput = document.getElementById('hotkeyInput');
    if (hotkeyInput) {
        hotkeyInput.value = settings.hotkey || '^+Space';
    }
    
    const autoHideCheck = document.getElementById('autoHideCheck');
    if (autoHideCheck) {
        autoHideCheck.checked = settings.autoHide || false;
    }
    
    const alwaysOnTopCheck = document.getElementById('alwaysOnTopCheck');
    if (alwaysOnTopCheck) {
        alwaysOnTopCheck.checked = settings.alwaysOnTop || true;
    }
}

// 保存设置
function saveSettings() {
    const hotkey = document.getElementById('hotkeyInput').value.trim();
    const autoHide = document.getElementById('autoHideCheck').checked;
    const alwaysOnTop = document.getElementById('alwaysOnTopCheck').checked;
    
    if (!hotkey) {
        alert('快捷键不能为空!');
        return;
    }
    
    try {
        // 更新本地设置
        settings.hotkey = hotkey;
        settings.autoHide = autoHide;
        settings.alwaysOnTop = alwaysOnTop;
        
        // 发送到AHK
        window.chrome.webview.postMessage({
            action: 'updateSettings',
            hotkey: hotkey,
            autoHide: autoHide,
            alwaysOnTop: alwaysOnTop
        });
        
        alert('设置已保存!');
    } catch (error) {
        console.error('保存设置时出错:', error);
        showError('保存设置失败');
    }
}

// 更新脚本设置表单
function updateScriptsForm() {
    // 这里需要从AHK获取脚本的启用状态，暂时默认为false
    const easyDragCheck = document.getElementById('easyDragCheck');
    if (easyDragCheck) {
        easyDragCheck.checked = false;
    }
    
    const keyboardCheck = document.getElementById('keyboardCheck');
    if (keyboardCheck) {
        keyboardCheck.checked = false;
    }
}

// 保存脚本设置
function saveScriptSettings() {
    const easyDrag = document.getElementById('easyDragCheck').checked;
    const keyboard = document.getElementById('keyboardCheck').checked;
    
    try {
        // 发送到AHK
        window.chrome.webview.postMessage({
            action: 'toggleScript',
            scripts: {
                'easy-window-dragging': easyDrag,
                'on-screen-keyboard': keyboard
            }
        });
        
        alert('脚本设置已保存!');
    } catch (error) {
        console.error('保存脚本设置时出错:', error);
        showError('保存脚本设置失败');
    }
}

// 显示错误信息
function showError(message) {
    alert('错误: ' + message);
} 