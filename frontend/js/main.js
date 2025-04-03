// 管理面板 JavaScript

// 引入 jQuery
import $ from "jquery"

// 引入 Bootstrap
import "bootstrap"
import { Modal } from "bootstrap"

// 引入 store 模块 (假设 store 是一个自定义模块)
import * as store from "./store" // 假设 store.js 文件在同一目录下

// 全局变量
let snippetsData = {}
let settings = {}
let currentGroup = ""
let isEditing = false
let currentSnippetName = ""

// 文档加载完成后执行
$(document).ready(() => {
  console.log("文档已加载，开始初始化...")

  // 初始化
  initialize()

  // 标签页切换事件
  $('#main-tabs button[data-bs-toggle="tab"]').on("shown.bs.tab", (e) => {
    console.log("标签页已切换", e.target.id)
    // 根据切换的标签页执行不同的操作
    if (e.target.id === "settings-tab") {
      // 当切换到设置标签页时更新设置表单
      updateSettingsForm()
    } else if (e.target.id === "snippets-tab") {
      // 当切换到片段管理标签页时刷新片段列表
      renderGroups()
    }
  })

  // 添加片段按钮点击事件
  $("#add-snippet-btn").on("click", () => {
    console.log("添加片段按钮点击")
    openAddSnippetModal()
  })

  // 添加分组按钮点击事件
  $("#add-group-btn").on("click", () => {
    console.log("添加分组按钮点击")
    openAddGroupModal()
  })

  // 重命名分组按钮点击事件
  $("#rename-group-btn").on("click", () => {
    console.log("重命名分组按钮点击")
    openRenameGroupModal()
  })

  // 删除分组按钮点击事件
  $("#delete-group-btn").on("click", () => {
    console.log("删除分组按钮点击")
    confirmDeleteGroup()
  })

  // 保存片段按钮点击事件
  $("#save-snippet-btn").on("click", saveSnippet)

  // 保存分组按钮点击事件
  $("#save-group-btn").on("click", saveGroup)

  // 保存设置按钮点击事件
  $("#save-settings-btn").on("click", saveSettings)

  // 导出数据按钮点击事件
  $("#export-data-btn").on("click", () => {
    exportData()
  })

  // 导入数据按钮点击事件
  $("#import-data-btn").on("click", () => {
    importData()
  })
})

// 初始化函数
function initialize() {
  console.log("开始初始化...")

  // 确保store已经初始化
  if (typeof store === "undefined") {
    console.error("Store模块未加载，尝试重新加载页面")
    showError("数据存储模块未加载，请刷新页面")
    return
  }

  // 使用store模块获取数据
  snippetsData = store.snippetsData || {}
  settings = store.settings || {}

  console.log("初始化数据:", {
    snippetsData: Object.keys(snippetsData),
    settings: settings,
    devMode: store.devMode,
  })

  // 如果在开发模式下
  if (store.devMode) {
    console.log("开发模式初始化")
    // 添加开发模式标识
    $("body").append(
      '<div class="position-fixed bottom-0 start-0 p-3"><span class="badge bg-warning">开发模式</span></div>',
    )

    // 立即填充UI
    updateUI()

    // 5秒后显示开发模式提示
    setTimeout(() => {
      if ($("#dev-mode-info").length) {
        const devModeModal = new Modal(document.getElementById("dev-mode-info"))
        devModeModal.show()
      }
    }, 5000)
  } else {
    console.log("正常模式初始化")
    // 正常模式，添加消息处理器
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.addEventListener("message", handleMessage)

      // 请求数据
      requestDataFromAHK()
    } else {
      console.warn("WebView2环境不可用，切换到开发模式")
      store.devMode = true
      updateUI()
    }
  }
}

// 处理来自AHK的消息
function handleMessage(event) {
  console.log("收到消息:", event.data)
  const message = event.data

  if (message.data) {
    // 更新片段数据
    snippetsData = message.data
    updateUI()
  }

  if (message.settings) {
    // 更新设置
    settings = message.settings
    updateSettingsForm()
  }
}

// 请求数据
function requestDataFromAHK() {
  console.log("向AHK请求数据")
  try {
    window.chrome.webview.postMessage({
      action: "getData",
    })
  } catch (error) {
    console.warn("无法发送消息到AHK，切换到开发模式:", error)
    store.devMode = true
    updateUI()
  }
}

// 打开添加片段模态框
function openAddSnippetModal() {
  // 清空表单
  $("#snippet-id").val("")
  $("#snippet-name").val("")
  $("#snippet-content").val("")
  $("#snippet-modal-title").text("添加片段")
  isEditing = false

  // 检查是否已选择分组
  if (!currentGroup) {
    showToast("请先选择或创建一个分组")
    return
  }

  // 显示模态框
  const snippetModal = new Modal(document.getElementById("snippet-modal"))
  snippetModal.show()
}

// 打开添加分组模态框
function openAddGroupModal() {
  $("#old-group-name").val("")
  $("#group-name").val("")
  $("#group-modal-title").text("添加分组")

  // 显示模态框
  const groupModal = new Modal(document.getElementById("group-modal"))
  groupModal.show()
}

// 打开重命名分组模态框
function openRenameGroupModal() {
  if (!currentGroup) {
    showToast("请先选择一个分组")
    return
  }

  $("#old-group-name").val(currentGroup)
  $("#group-name").val(currentGroup)
  $("#group-modal-title").text("重命名分组")

  // 显示模态框
  const groupModal = new Modal(document.getElementById("group-modal"))
  groupModal.show()
}

// 确认删除分组
function confirmDeleteGroup() {
  if (!currentGroup) {
    showToast("请先选择一个分组")
    return
  }

  if (confirm(`确定要删除分组 "${currentGroup}" 及其所有片段吗？此操作无法撤销。`)) {
    deleteGroup(currentGroup)
  }
}

// 删除分组
function deleteGroup(groupName) {
  if (snippetsData[groupName]) {
    delete snippetsData[groupName]

    // 如果删除的是当前选中的分组，清除当前选择
    if (groupName === currentGroup) {
      currentGroup = ""
      $("#current-group-name").text("请选择一个分组")
      $("#add-snippet-btn").prop("disabled", true)
      $("#snippets-list").html('<div class="text-center p-5 text-muted">请选择一个分组以查看片段</div>')
    }

    // 保存更改
    store
      .saveSnippets(snippetsData)
      .then(() => {
        renderGroups()
        showToast(`分组 "${groupName}" 已删除`)
      })
      .catch((error) => {
        console.error("删除分组失败:", error)
        showError("删除分组失败")
      })
  }
}

// 保存片段
function saveSnippet() {
  // 取消默认表单提交行为
  event.preventDefault()

  // 获取片段名称和内容
  const snippetName = $("#snippet-name").val().trim()
  const snippetContent = $("#snippet-content").val()

  // 验证片段名称
  if (!snippetName) {
    showError("片段名称不能为空")
    return
  }

  // 检查是否正在编辑现有片段
  if (isEditing) {
    // 如果片段名称发生变化，需要删除旧名称的片段
    if (currentSnippetName !== snippetName && snippetsData[currentGroup]) {
      delete snippetsData[currentGroup][currentSnippetName]
    }
  } else {
    // 检查片段是否已存在
    if (snippetsData[currentGroup] && snippetsData[currentGroup][snippetName]) {
      showError(`片段 "${snippetName}" 已存在于分组 "${currentGroup}" 中`)
      return
    }
  }

  // 确保分组存在
  if (!snippetsData[currentGroup]) {
    snippetsData[currentGroup] = {}
  }

  // 保存片段
  snippetsData[currentGroup][snippetName] = snippetContent

  // 使用store模块保存
  store
    .saveSnippets(snippetsData)
    .then(() => {
      // 更新界面
      renderSnippets(currentGroup)

      // 关闭模态框
      const modalElement = document.getElementById("snippet-modal")
      const modal = Modal.getInstance(modalElement)
      if (modal) modal.hide()

      // 显示成功消息
      showToast(`片段 "${snippetName}" 已保存到分组 "${currentGroup}"`)
    })
    .catch((error) => {
      console.error("保存片段失败:", error)
      showError("保存片段失败")
    })
}

// 保存分组
function saveGroup() {
  // 取消默认表单提交行为
  event.preventDefault()

  // 获取分组名称
  const groupName = $("#group-name").val().trim()

  // 验证分组名称
  if (!groupName) {
    showError("分组名称不能为空")
    return
  }

  // 获取旧分组名称（如果在编辑）
  const oldGroupName = $("#old-group-name").val()

  // 如果是新分组，检查是否已存在
  if (!oldGroupName && snippetsData[groupName]) {
    showError(`分组 "${groupName}" 已存在`)
    return
  }

  // 如果是重命名分组
  if (oldGroupName && oldGroupName !== groupName) {
    // 创建新分组，复制所有片段
    snippetsData[groupName] = { ...snippetsData[oldGroupName] }

    // 删除旧分组
    delete snippetsData[oldGroupName]

    // 如果当前选中的是被重命名的分组，更新当前分组
    if (currentGroup === oldGroupName) {
      currentGroup = groupName
    }
  } else if (!snippetsData[groupName]) {
    // 创建新的空分组
    snippetsData[groupName] = {}
  }

  // 使用store模块保存
  store
    .saveSnippets(snippetsData)
    .then(() => {
      // 更新界面
      renderGroups()

      // 如果是新分组，自动选中它
      if (!oldGroupName) {
        selectGroup(groupName)
      }

      // 关闭模态框
      const modalElement = document.getElementById("group-modal")
      const modal = Modal.getInstance(modalElement)
      if (modal) modal.hide()

      // 显示成功消息
      showToast(oldGroupName ? `分组已重命名为 "${groupName}"` : `分组 "${groupName}" 已创建`)
    })
    .catch((error) => {
      console.error("保存分组失败:", error)
      showError("保存分组失败")
    })
}

// 保存设置
function saveSettings() {
  // 取消默认表单提交行为
  event.preventDefault()

  // 获取设置表单的值
  const hotkey = $("#hotkey-input").val()
  const autoHide = $("#auto-hide-switch").prop("checked")
  const alwaysOnTop = $("#always-on-top-switch").prop("checked")
  const easyWindowDragging = $("#easy-dragging-switch").prop("checked")
  const onScreenKeyboard = $("#on-screen-keyboard-switch").prop("checked")

  // 更新设置对象
  settings = {
    hotkey: hotkey || "^+Space",
    autoHide: autoHide,
    alwaysOnTop: alwaysOnTop,
    scripts: {
      "easy-window-dragging": easyWindowDragging,
      "on-screen-keyboard": onScreenKeyboard,
    },
  }

  // 使用store模块保存设置
  store
    .saveSettings(settings)
    .then(() => {
      showToast("设置已保存")
    })
    .catch((error) => {
      console.error("保存设置失败:", error)
      showError("保存设置失败")
    })
}

// 更新界面
function updateUI() {
  console.log("更新UI...")

  // 渲染分组列表
  renderGroups()

  // 更新设置表单
  updateSettingsForm()
}

// 渲染分组列表
function renderGroups() {
  console.log("渲染分组列表...")
  const $groupsList = $("#groups-list")
  $groupsList.empty()

  // 如果没有分组，显示提示
  if (!snippetsData || Object.keys(snippetsData).length === 0) {
    $groupsList.html('<div class="text-center p-3 text-muted">没有分组，请点击添加分组按钮创建</div>')
    return
  }

  // 添加所有分组
  $.each(snippetsData, (groupName, group) => {
    const $groupItem = $("<a>")
      .addClass("list-group-item list-group-item-action d-flex justify-content-between align-items-center")
      .attr("href", "#")
      .attr("data-group", groupName)
      .html(`
                ${groupName}
                <span class="badge bg-primary rounded-pill">${Object.keys(group).length}</span>
            `)

    // 如果是当前选中的分组，添加active类
    if (groupName === currentGroup) {
      $groupItem.addClass("active")
    }

    // 绑定点击事件
    $groupItem.on("click", (e) => {
      e.preventDefault()
      selectGroup(groupName)
    })

    $groupsList.append($groupItem)
  })
}

// 选择分组
function selectGroup(groupName) {
  console.log("选择分组:", groupName)
  currentGroup = groupName

  // 更新分组列表样式
  $(".list-group-item").removeClass("active")
  $(`.list-group-item[data-group="${groupName}"]`).addClass("active")

  // 更新片段列表标题
  $("#current-group-name").text(groupName)

  // 启用添加片段按钮
  $("#add-snippet-btn").prop("disabled", false)

  // 渲染片段列表
  renderSnippets(groupName)
}

// 渲染片段列表
function renderSnippets(groupName) {
  console.log("渲染片段列表:", groupName)
  const $snippetsList = $("#snippets-list")
  $snippetsList.empty()

  if (!snippetsData[groupName]) {
    $snippetsList.html('<div class="text-center p-5 text-muted">未找到分组数据</div>')
    return
  }

  const group = snippetsData[groupName]
  const snippetNames = Object.keys(group)

  // 如果分组中没有片段，显示提示
  if (snippetNames.length === 0) {
    $snippetsList.html('<div class="text-center p-5 text-muted">该分组中没有片段，请点击添加片段按钮创建</div>')
    return
  }

  // 添加所有片段
  $.each(group, (snippetName, snippetContent) => {
    // 创建片段卡片
    const $snippetCard = $("<div>").addClass("card mb-3").attr("data-name", snippetName)

    // 创建片段标题和操作按钮
    const $cardHeader = $("<div>").addClass("card-header d-flex justify-content-between align-items-center")

    const $snippetTitle = $("<h5>").addClass("mb-0 card-title").text(snippetName)

    const $actionButtons = $("<div>").addClass("btn-group btn-group-sm")

    // 编辑按钮
    const $editBtn = $("<button>")
      .addClass("btn btn-outline-secondary")
      .html('<i class="bi bi-pencil"></i>')
      .attr("title", "编辑")
      .on("click", () => {
        editSnippet(groupName, snippetName)
      })

    // 复制按钮
    const $copyBtn = $("<button>")
      .addClass("btn btn-outline-primary")
      .html('<i class="bi bi-clipboard"></i>')
      .attr("title", "复制")
      .on("click", () => {
        copySnippet(snippetContent)
      })

    // 删除按钮
    const $deleteBtn = $("<button>")
      .addClass("btn btn-outline-danger")
      .html('<i class="bi bi-trash"></i>')
      .attr("title", "删除")
      .on("click", () => {
        confirmDeleteSnippet(groupName, snippetName)
      })

    $actionButtons.append($editBtn, $copyBtn, $deleteBtn)
    $cardHeader.append($snippetTitle, $actionButtons)

    // 创建片段内容
    const $cardBody = $("<div>").addClass("card-body")

    const $snippetContent = $("<pre>").addClass("snippet-content p-2 bg-light rounded").text(snippetContent)

    $cardBody.append($snippetContent)

    // 组装片段卡片
    $snippetCard.append($cardHeader, $cardBody)
    $snippetsList.append($snippetCard)
  })
}

// 编辑片段
function editSnippet(groupName, snippetName) {
  console.log("编辑片段:", groupName, snippetName)
  isEditing = true
  currentSnippetName = snippetName

  $("#snippet-modal-title").text("编辑片段")
  $("#snippet-name").val(snippetName)
  $("#snippet-content").val(snippetsData[groupName][snippetName])

  // 显示模态框
  const snippetModal = new Modal(document.getElementById("snippet-modal"))
  snippetModal.show()
}

// 确认删除片段
function confirmDeleteSnippet(groupName, snippetName) {
  console.log("确认删除片段:", groupName, snippetName)
  if (confirm(`确定要删除片段 "${snippetName}" 吗？此操作无法撤销。`)) {
    deleteSnippet(groupName, snippetName)
  }
}

// 删除片段
function deleteSnippet(groupName, snippetName) {
  console.log("删除片段:", groupName, snippetName)

  // 从数据中删除片段
  if (snippetsData[groupName] && snippetsData[groupName][snippetName]) {
    delete snippetsData[groupName][snippetName]

    // 保存更改
    store
      .saveSnippets(snippetsData)
      .then(() => {
        renderSnippets(groupName)
        showToast(`片段 "${snippetName}" 已删除`)
      })
      .catch((error) => {
        console.error("删除片段失败:", error)
        showError("删除片段失败")
      })
  } else {
    showError(`找不到片段 "${snippetName}"`)
  }
}

// 复制片段到剪贴板
function copySnippet(content) {
  console.log("复制片段...")

  // 使用store模块复制片段
  store
    .copySnippet(content)
    .then(() => {
      showToast("片段已复制到剪贴板")
    })
    .catch((error) => {
      console.error("复制片段失败:", error)
      showError("复制片段失败")
    })
}

// 更新设置表单
function updateSettingsForm() {
  console.log("更新设置表单...")

  // 热键设置
  $("#hotkey-input").val(settings.hotkey || "^+Space")
  $("#current-hotkey").text(settings.hotkey || "^+Space")

  // 行为设置
  $("#auto-hide-switch").prop("checked", settings.autoHide !== false)
  $("#always-on-top-switch").prop("checked", settings.alwaysOnTop !== false)

  // 集成功能设置
  $("#easy-dragging-switch").prop("checked", (settings.scripts && settings.scripts["easy-window-dragging"]) || false)
  $("#on-screen-keyboard-switch").prop("checked", (settings.scripts && settings.scripts["on-screen-keyboard"]) || false)
}

// 导出数据
function exportData() {
  try {
    const dataStr = JSON.stringify(snippetsData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = "snippet-butler-data.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    showToast("数据导出成功")
  } catch (error) {
    console.error("导出数据失败:", error)
    showError("导出数据失败")
  }
}

// 导入数据
function importData() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json"

  input.onchange = (e) => {
    const file = e.target.files[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result)

        // 验证导入的数据格式
        if (typeof importedData !== "object") {
          throw new Error("导入的数据格式不正确")
        }

        // 确认导入
        if (confirm("确定要导入这些数据吗？这将覆盖当前的所有片段数据。")) {
          snippetsData = importedData

          // 保存导入的数据
          store
            .saveSnippets(snippetsData)
            .then(() => {
              // 更新界面
              renderGroups()
              showToast("数据导入成功")
            })
            .catch((error) => {
              console.error("保存导入数据失败:", error)
              showError("保存导入数据失败")
            })
        }
      } catch (error) {
        console.error("导入数据失败:", error)
        showError("导入的文件不是有效的JSON格式")
      }
    }

    reader.readAsText(file)
  }

  input.click()
}

// 显示错误提示
function showError(message) {
  console.error("错误:", message)

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
    </div>`

  // 移除可能存在的旧Toast
  $(".toast-container").remove()

  // 添加新Toast
  $("body").append(toastHtml)

  // 显示Toast
  const toastEl = document.getElementById("errorToast")
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 })
  toast.show()
}

// 显示成功提示
function showToast(message) {
  console.log("提示:", message)

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
    </div>`

  // 移除可能存在的旧Toast
  $(".toast-container").remove()

  // 添加新Toast
  $("body").append(toastHtml)

  // 显示Toast
  const toastEl = document.getElementById("successToast")
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 })
  toast.show()
}

