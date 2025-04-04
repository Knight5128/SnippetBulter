// 管理面板 JavaScript

// 全局变量
let snippetsData = {};
let settings = {};
let currentGroup = "";
let isEditing = false;
let currentSnippetName = "";

// 文档加载完成后执行
$(document).ready(function() {
    console.log("文档已加载，开始初始化...");
    
    // 在DOM准备好后，强制检查并初始化
    setTimeout(function() {
        console.log("DOM准备完毕，执行初始化");
        initialize();
    }, 200);
    
    // 标签页切换事件
    $('#main-tabs button[data-bs-toggle="tab"]').on("shown.bs.tab", function(e) {
        console.log("标签页已切换", e.target.id);
        // 根据切换的标签页执行不同的操作
        if (e.target.id === "settings-tab") {
            // 当切换到设置标签页时更新设置表单
            updateSettingsForm();
        } else if (e.target.id === "snippets-tab") {
            // 当切换到片段管理标签页时刷新片段列表
            renderGroups();
        }
    });
    
    // 添加片段按钮点击事件
    $("#add-snippet-btn").on("click", function() {
        console.log("添加片段按钮点击");
        openAddSnippetModal();
    });
    
    // 添加分组按钮点击事件
    $("#add-group-btn").on("click", function() {
        console.log("添加分组按钮点击");
        openAddGroupModal();
    });
    
    // 重命名分组按钮点击事件
    $("#rename-group-btn").on("click", function() {
        console.log("重命名分组按钮点击");
        openRenameGroupModal();
    });
    
    // 删除分组按钮点击事件
    $("#delete-group-btn").on("click", function() {
        console.log("删除分组按钮点击");
        confirmDeleteGroup();
    });
    
    // 保存片段按钮点击事件
    $("#save-snippet-btn").on("click", saveSnippet);
    
    // 保存分组按钮点击事件
    $("#save-group-btn").on("click", saveGroup);
    
    // 保存设置按钮点击事件
    $("#save-settings-btn").on("click", saveSettings);
    
    // 导出数据按钮点击事件
    $("#export-data-btn").on("click", function() {
        exportData();
    });
    
    // 导入数据按钮点击事件
    $("#import-data-btn").on("click", function() {
        importData();
    });
});

// 初始化函数
function initialize() {
    console.log("====== 开始初始化 ======");
    
    // 检查store模块
    if (typeof window.store === "undefined") {
        console.error("Store模块未加载，请检查是否已引入store.js");
        showError("数据存储模块未加载，请刷新页面或检查控制台错误");
        
        // 尝试重新加载页面
        setTimeout(function() {
            location.reload();
        }, 3000);
        return;
    }
    
    console.log("Store模块状态:", {
        devMode: window.store.devMode,
        hasSnippetsData: Boolean(window.store.snippetsData) && Object.keys(window.store.snippetsData).length > 0,
        hasSettings: Boolean(window.store.settings) && Object.keys(window.store.settings).length > 0
    });
    
    // 初始化数据
    snippetsData = window.store.snippetsData || {};
    settings = window.store.settings || {};
    
    // 如果在开发模式下
    if (window.store.devMode) {
        console.log("开发模式初始化");
        // 添加开发模式标识
        $("body").append(
            '<div class="position-fixed bottom-0 start-0 p-3"><span class="badge bg-warning">开发模式</span></div>'
        );
        
        // 如果没有示例数据，添加一些默认数据用于演示
        if (Object.keys(snippetsData).length === 0) {
            console.log("添加示例数据...");
            snippetsData = {
                "示例分组": {
                    "欢迎使用": "这是一个示例片段，您可以添加自己的内容。",
                    "HTML模板": "<!DOCTYPE html>\n<html>\n<head>\n  <title>标题</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>"
                }
            };
            window.store.snippetsData = snippetsData;
        }
        
        // 立即填充UI
        updateUI();
    } else {
        console.log("正常模式初始化");
        // 正常模式，添加消息处理器
        if (window.chrome && window.chrome.webview) {
            console.log("WebView2环境已检测到，添加消息处理器");
            window.chrome.webview.addEventListener("message", handleMessage);
            
            // 请求数据
            console.log("向后端请求数据...");
            requestDataFromAHK();
            
            // 5秒后如果仍无数据，尝试再次请求
            setTimeout(function() {
                if (Object.keys(snippetsData).length === 0) {
                    console.log("5秒后仍无数据，再次请求...");
                    requestDataFromAHK();
                    
                    // 再等5秒，如果仍无数据，显示错误
                    setTimeout(function() {
                        if (Object.keys(snippetsData).length === 0) {
                            console.error("无法从后端获取数据，切换到开发模式...");
                            window.store.devMode = true;
                            // 添加开发模式标识
                            $("body").append(
                                '<div class="position-fixed bottom-0 start-0 p-3"><span class="badge bg-danger">数据加载失败</span></div>'
                            );
                            // 使用默认数据
                            snippetsData = {
                                "示例分组": {
                                    "欢迎使用": "这是一个示例片段，您可以添加自己的内容。",
                                    "HTML模板": "<!DOCTYPE html>\n<html>\n<head>\n  <title>标题</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>"
                                }
                            };
                            window.store.snippetsData = snippetsData;
                            updateUI();
                            showError("无法从后端获取数据，已加载示例数据。请重启应用程序。");
                        }
                    }, 5000);
                }
            }, 5000);
        } else {
            console.warn("WebView2环境不可用，切换到开发模式");
            window.store.devMode = true;
            // 添加开发模式标识
            $("body").append(
                '<div class="position-fixed bottom-0 start-0 p-3"><span class="badge bg-danger">WebView2不可用</span></div>'
            );
            showError("WebView2环境不可用，已切换到开发模式。这可能是由于直接在浏览器中打开页面导致的。");
            updateUI();
        }
    }
    
    // 启用拖放排序功能
    initializeSortable();
}

// 初始化拖放排序
function initializeSortable() {
    try {
        // 分组排序
        $(".groups-sortable").sortable({
            placeholder: "list-group-item list-group-item-action bg-light border-dashed",
            update: function(event, ui) {
                // 分组排序完成后的处理（如果需要）
                console.log("分组顺序已更改");
            }
        });
        
        // 片段排序
        $(".snippets-sortable").sortable({
            placeholder: "card bg-light border-dashed mb-3",
            handle: ".card-header",
            update: function(event, ui) {
                // 片段排序完成后的处理（如果需要）
                console.log("片段顺序已更改");
            }
        });
    } catch (error) {
        console.warn("初始化拖放排序失败:", error);
    }
}

// 处理来自AHK的消息
function handleMessage(event) {
    console.log("收到消息:", typeof event.data, event.data ? (typeof event.data === 'string' ? event.data.substring(0, 100) : JSON.stringify(event.data).substring(0, 100)) : "null", "...");
    let message;
    
    try {
        // 尝试将消息解析为对象（如果它是字符串的话）
        if (typeof event.data === 'string') {
            message = JSON.parse(event.data);
        } else {
            message = event.data;
        }
        console.log("解析后的消息类型:", typeof message);
        console.log("消息内容:", Object.keys(message));
    } catch (error) {
        console.error("解析消息失败:", error);
        message = event.data; // 如果解析失败，使用原始数据
    }
    
    if (message.data) {
        // 更新片段数据
        console.log("接收到片段数据, 组数:", Object.keys(message.data).length);
        snippetsData = message.data;
        window.store.snippetsData = message.data; // 同步更新store中的数据
        updateUI();
    } else {
        console.warn("消息中没有片段数据");
    }
    
    if (message.settings) {
        // 更新设置
        console.log("接收到设置数据:", message.settings);
        settings = message.settings;
        window.store.settings = message.settings; // 同步更新store中的数据
        updateSettingsForm();
    } else {
        console.warn("消息中没有设置数据");
    }
}

// 请求数据
function requestDataFromAHK() {
    console.log("向AHK请求数据");
    try {
        window.chrome.webview.postMessage({
            action: "getData",
        });
    } catch (error) {
        console.warn("无法发送消息到AHK，切换到开发模式:", error);
        window.store.devMode = true;
        updateUI();
    }
}

// 打开添加片段模态框
function openAddSnippetModal() {
    // 清空表单
    $("#snippet-id").val("");
    $("#snippet-name").val("");
    $("#snippet-content").val("");
    $("#snippet-modal-title").text("添加片段");
    isEditing = false;
    
    // 检查是否已选择分组
    if (!currentGroup) {
        showToast("请先选择或创建一个分组");
        return;
    }
    
    // 显示模态框
    const snippetModal = new bootstrap.Modal(document.getElementById("snippet-modal"));
    snippetModal.show();
}

// 打开添加分组模态框
function openAddGroupModal() {
    $("#old-group-name").val("");
    $("#group-name").val("");
    $("#group-modal-title").text("添加分组");
    
    // 显示模态框
    const groupModal = new bootstrap.Modal(document.getElementById("group-modal"));
    groupModal.show();
}

// 打开重命名分组模态框
function openRenameGroupModal() {
    if (!currentGroup) {
        showToast("请先选择一个分组");
        return;
    }
    
    $("#old-group-name").val(currentGroup);
    $("#group-name").val(currentGroup);
    $("#group-modal-title").text("重命名分组");
    
    // 显示模态框
    const groupModal = new bootstrap.Modal(document.getElementById("group-modal"));
    groupModal.show();
}

// 确认删除分组
function confirmDeleteGroup() {
    if (!currentGroup) {
        showToast("请先选择一个分组");
        return;
    }
    
    if (confirm(`确定要删除分组 "${currentGroup}" 及其所有片段吗？此操作无法撤销。`)) {
        deleteGroup(currentGroup);
    }
}

// 删除分组
function deleteGroup(groupName) {
    if (snippetsData[groupName]) {
        delete snippetsData[groupName];
        
        // 如果删除的是当前选中的分组，清除当前选择
        if (groupName === currentGroup) {
            currentGroup = "";
            $("#current-group-name").text("请选择一个分组");
            $("#add-snippet-btn").prop("disabled", true);
            $("#snippets-list").html('<div class="text-center p-5 text-muted">请选择一个分组以查看片段</div>');
        }
        
        // 保存更改
        window.store
            .saveSnippets(snippetsData)
            .then(function() {
                renderGroups();
                showToast(`分组 "${groupName}" 已删除`);
            })
            .catch(function(error) {
                console.error("删除分组失败:", error);
                showError("删除分组失败");
            });
    }
}

// 保存片段
function saveSnippet(event) {
    // 取消默认表单提交行为
    if (event) event.preventDefault();
    
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
        // 如果片段名称发生变化，需要删除旧名称的片段
        if (currentSnippetName !== snippetName && snippetsData[currentGroup]) {
            delete snippetsData[currentGroup][currentSnippetName];
        }
    } else {
        // 检查片段是否已存在
        if (snippetsData[currentGroup] && snippetsData[currentGroup][snippetName]) {
            showError(`片段 "${snippetName}" 已存在于分组 "${currentGroup}" 中`);
            return;
        }
    }
    
    // 确保分组存在
    if (!snippetsData[currentGroup]) {
        snippetsData[currentGroup] = {};
    }
    
    // 保存片段
    snippetsData[currentGroup][snippetName] = snippetContent;
    
    // 使用store模块保存
    window.store
        .saveSnippets(snippetsData)
        .then(function() {
            // 更新界面
            renderSnippets(currentGroup);
            
            // 关闭模态框
            const modalElement = document.getElementById("snippet-modal");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            
            // 显示成功消息
            showToast(`片段 "${snippetName}" 已保存到分组 "${currentGroup}"`);
        })
        .catch(function(error) {
            console.error("保存片段失败:", error);
            showError("保存片段失败");
        });
}

// 保存分组
function saveGroup(event) {
    // 取消默认表单提交行为
    if (event) event.preventDefault();
    
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
        snippetsData[groupName] = { ...snippetsData[oldGroupName] };
        
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
    window.store
        .saveSnippets(snippetsData)
        .then(function() {
            // 更新界面
            renderGroups();
            
            // 如果是新分组，自动选中它
            if (!oldGroupName) {
                selectGroup(groupName);
            }
            
            // 关闭模态框
            const modalElement = document.getElementById("group-modal");
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            
            // 显示成功消息
            showToast(oldGroupName ? `分组已重命名为 "${groupName}"` : `分组 "${groupName}" 已创建`);
        })
        .catch(function(error) {
            console.error("保存分组失败:", error);
            showError("保存分组失败");
        });
}

// 保存设置
function saveSettings(event) {
    // 取消默认表单提交行为
    if (event) event.preventDefault();
    
    // 获取设置表单的值
    const hotkey = $("#hotkey-input").val();
    const autoHide = $("#auto-hide-switch").prop("checked");
    const alwaysOnTop = $("#always-on-top-switch").prop("checked");
    const easyWindowDragging = $("#easy-dragging-switch").prop("checked");
    const onScreenKeyboard = $("#on-screen-keyboard-switch").prop("checked");
    
    // 更新设置对象
    settings = {
        hotkey: hotkey || "^+Space",
        autoHide: autoHide,
        alwaysOnTop: alwaysOnTop,
        scripts: {
            "easy-window-dragging": easyWindowDragging,
            "on-screen-keyboard": onScreenKeyboard,
        },
    };
    
    // 使用store模块保存设置
    window.store
        .saveSettings(settings)
        .then(function() {
            showToast("设置已保存");
        })
        .catch(function(error) {
            console.error("保存设置失败:", error);
            showError("保存设置失败");
        });
}

// 更新UI
function updateUI() {
    console.log("开始更新UI...");
    try {
        renderGroups();
        if (currentGroup) {
            renderSnippets(currentGroup);
        }
        updateSettingsForm();
        console.log("UI更新完成");
    } catch (error) {
        console.error("更新UI时发生错误:", error);
        showError("更新界面失败: " + error.message);
    }
}

// 渲染分组列表
function renderGroups() {
    console.log("渲染分组列表，数据:", Object.keys(snippetsData));
    const groupsList = $("#groups-list");
    groupsList.empty();
    
    const groupNames = Object.keys(snippetsData).sort();
    
    if (groupNames.length === 0) {
        // 如果没有分组，显示提示
        groupsList.html('<div class="text-center p-3 text-muted">暂无分组，请添加</div>');
        // 确保片段列表也清空并显示提示
        $("#snippets-list").html('<div class="text-center p-5 text-muted">请先添加分组</div>');
        $("#current-group-name").text("无分组");
        $("#add-snippet-btn").prop("disabled", true); // 禁用添加片段按钮
        currentGroup = ""; // 清除当前分组
        return;
    }
    
    // 创建分组列表
    groupNames.forEach(groupName => {
        const groupItem = $(`
            <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-group="${groupName}">
                <span>${groupName}</span>
                <span class="badge bg-primary rounded-pill">${Object.keys(snippetsData[groupName] || {}).length}</span>
            </a>
        `);
        
        // 设置点击事件
        groupItem.on("click", function(e) {
            e.preventDefault();
            selectGroup(groupName);
        });
        
        // Note: Active class will be set in selectGroup or after the loop
        
        groupsList.append(groupItem);
    });
    
    // **新增逻辑**: 如果没有当前选中的分组，并且列表不为空，则自动选择第一个分组
    if (!currentGroup && groupNames.length > 0) {
        console.log("没有选中分组，自动选择第一个:", groupNames[0]);
        selectGroup(groupNames[0]);
    } else if (currentGroup && groupNames.includes(currentGroup)) {
         // 如果当前选中的分组仍然存在，确保它被高亮显示
         console.log("重新渲染，保持选中:", currentGroup);
         // 确保active状态正确
         $('.list-group-item').removeClass('active');
         $(`.list-group-item[data-group="${currentGroup}"]`).addClass('active');
         // 可能需要重新渲染该分组的片段，以防数据更新
         renderSnippets(currentGroup);
    } else if (currentGroup && !groupNames.includes(currentGroup)) {
        // 如果之前选中的分组被删除了，选择第一个
        console.log("之前选中的分组已不存在，自动选择第一个:", groupNames[0]);
        selectGroup(groupNames[0]);
    }
}

// 选择分组
function selectGroup(groupName) {
    console.log("选择分组:", groupName);
    // 检查分组是否存在
    if (!snippetsData[groupName]) {
        console.warn(`尝试选择不存在的分组: ${groupName}`);
        // 可以选择第一个分组作为备用
        const firstGroup = Object.keys(snippetsData).sort()[0];
        if (firstGroup) {
            console.log(`回退到选择第一个分组: ${firstGroup}`);
            groupName = firstGroup;
        } else {
            // 没有分组可选
             $("#snippets-list").html('<div class="text-center p-5 text-muted">无可用分组</div>');
             $("#current-group-name").text("无分组");
             $("#add-snippet-btn").prop("disabled", true);
             currentGroup = "";
             $('.list-group-item').removeClass('active');
            return;
        }
    }

    currentGroup = groupName;

    // 更新分组列表样式
    $('.list-group-item').removeClass('active');
    $(`.list-group-item[data-group="${groupName}"]`).addClass('active'); // 使用属性选择器

    // 更新片段列表标题
    $("#current-group-name").text(groupName);

    // 启用添加片段按钮
    $("#add-snippet-btn").prop("disabled", false);

    // 渲染片段列表
    renderSnippets(groupName);
}

// 渲染片段列表
function renderSnippets(groupName) {
    console.log("渲染片段列表:", groupName);
    const $snippetsList = $("#snippets-list");
    $snippetsList.empty();
    
    if (!snippetsData[groupName]) {
        $snippetsList.html('<div class="text-center p-5 text-muted">未找到分组数据</div>');
        return;
    }
    
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
        const $snippetCard = $("<div>").addClass("card mb-3").attr("data-name", snippetName);
        
        // 创建片段标题和操作按钮
        const $cardHeader = $("<div>").addClass("card-header d-flex justify-content-between align-items-center");
        
        const $snippetTitle = $("<h5>").addClass("mb-0 card-title").text(snippetName);
        
        const $actionButtons = $("<div>").addClass("btn-group btn-group-sm");
        
        // 编辑按钮
        const $editBtn = $("<button>")
            .addClass("btn btn-outline-secondary")
            .html('<i class="bi bi-pencil"></i>')
            .attr("title", "编辑")
            .on("click", function() {
                editSnippet(groupName, snippetName);
            });
        
        // 复制按钮
        const $copyBtn = $("<button>")
            .addClass("btn btn-outline-primary")
            .html('<i class="bi bi-clipboard"></i>')
            .attr("title", "复制")
            .on("click", function() {
                copySnippet(snippetContent);
            });
        
        // 删除按钮
        const $deleteBtn = $("<button>")
            .addClass("btn btn-outline-danger")
            .html('<i class="bi bi-trash"></i>')
            .attr("title", "删除")
            .on("click", function() {
                confirmDeleteSnippet(groupName, snippetName);
            });
        
        $actionButtons.append($editBtn, $copyBtn, $deleteBtn);
        $cardHeader.append($snippetTitle, $actionButtons);
        
        // 创建片段内容
        const $cardBody = $("<div>").addClass("card-body");
        
        const $snippetContent = $("<pre>").addClass("snippet-content p-2 bg-light rounded").text(snippetContent);
        
        $cardBody.append($snippetContent);
        
        // 组装片段卡片
        $snippetCard.append($cardHeader, $cardBody);
        $snippetsList.append($snippetCard);
    });
}

// 编辑片段
function editSnippet(groupName, snippetName) {
    console.log("编辑片段:", groupName, snippetName);
    isEditing = true;
    currentSnippetName = snippetName;
    
    $("#snippet-modal-title").text("编辑片段");
    $("#snippet-name").val(snippetName);
    $("#snippet-content").val(snippetsData[groupName][snippetName]);
    
    // 显示模态框
    const snippetModal = new bootstrap.Modal(document.getElementById("snippet-modal"));
    snippetModal.show();
}

// 确认删除片段
function confirmDeleteSnippet(groupName, snippetName) {
    console.log("确认删除片段:", groupName, snippetName);
    if (confirm(`确定要删除片段 "${snippetName}" 吗？此操作无法撤销。`)) {
        deleteSnippet(groupName, snippetName);
    }
}

// 删除片段
function deleteSnippet(groupName, snippetName) {
    console.log("删除片段:", groupName, snippetName);
    
    // 从数据中删除片段
    if (snippetsData[groupName] && snippetsData[groupName][snippetName]) {
        delete snippetsData[groupName][snippetName];
        
        // 保存更改
        window.store
            .saveSnippets(snippetsData)
            .then(function() {
                renderSnippets(groupName);
                showToast(`片段 "${snippetName}" 已删除`);
            })
            .catch(function(error) {
                console.error("删除片段失败:", error);
                showError("删除片段失败");
            });
    } else {
        showError(`找不到片段 "${snippetName}"`);
    }
}

// 复制片段到剪贴板
function copySnippet(content) {
    console.log("复制片段...");
    
    // 使用store模块复制片段
    window.store
        .copySnippet(content)
        .then(function() {
            showToast("片段已复制到剪贴板");
        })
        .catch(function(error) {
            console.error("复制片段失败:", error);
            showError("复制片段失败");
        });
}

// 更新设置表单
function updateSettingsForm() {
    console.log("更新设置表单...");
    
    // 热键设置
    $("#hotkey-input").val(settings.hotkey || "^+Space");
    $("#current-hotkey").text(settings.hotkey || "^+Space");
    
    // 行为设置
    $("#auto-hide-switch").prop("checked", settings.autoHide !== false);
    $("#always-on-top-switch").prop("checked", settings.alwaysOnTop !== false);
    
    // 集成功能设置
    $("#easy-dragging-switch").prop("checked", (settings.scripts && settings.scripts["easy-window-dragging"]) || false);
    $("#on-screen-keyboard-switch").prop("checked", (settings.scripts && settings.scripts["on-screen-keyboard"]) || false);
}

// 导出数据
function exportData() {
    try {
        const dataStr = JSON.stringify(snippetsData, null, 2);
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = "snippet-butler-data.json";
        
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
        
        showToast("数据导出成功");
    } catch (error) {
        console.error("导出数据失败:", error);
        showError("导出数据失败");
    }
}

// 导入数据
function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 验证导入的数据格式
                if (typeof importedData !== "object") {
                    throw new Error("导入的数据格式不正确");
                }
                
                // 确认导入
                if (confirm("确定要导入这些数据吗？这将覆盖当前的所有片段数据。")) {
                    snippetsData = importedData;
                    
                    // 保存导入的数据
                    window.store
                        .saveSnippets(snippetsData)
                        .then(function() {
                            // 更新界面
                            renderGroups();
                            showToast("数据导入成功");
                        })
                        .catch(function(error) {
                            console.error("保存导入数据失败:", error);
                            showError("保存导入数据失败");
                        });
                }
            } catch (error) {
                console.error("导入数据失败:", error);
                showError("导入的文件不是有效的JSON格式");
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// 显示错误提示
function showError(message) {
    console.error("错误:", message);
    
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
    $(".toast-container").remove();
    
    // 添加新Toast
    $("body").append(toastHtml);
    
    // 显示Toast
    const toastEl = document.getElementById("errorToast");
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
}

// 显示成功提示
function showToast(message) {
    console.log("提示:", message);
    
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
    $(".toast-container").remove();
    
    // 添加新Toast
    $("body").append(toastHtml);
    
    // 显示Toast
    const toastEl = document.getElementById("successToast");
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

