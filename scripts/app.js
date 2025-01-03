import { decrypt, encrypt } from './crypto.js';

const websocket = new WebSocket('ws://127.0.0.1:1148');
const message_list = {}; // 用于保存消息的对象，以群号区分
const chatlist = {}; // 用于管理消息列表
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
websocket.onopen = function() {
    console.log('WebSocket连接已建立');
};

websocket.onmessage = function(event) {
    console.log("message_list", message_list);
    console.log("chat_list", chatlist);
    const message = JSON.parse(event.data);
    if (message.data && 'group_name' in message.data){
        // WS响应获取群信息
        chatlist[message.data.group_id].name = message.data.group_name;
        // 更新DOM
        const chatListContainer = document.getElementsByClassName('chat-items')[0];
        const groupElement = document.createElement('div');
        groupElement.className = 'chat-item';
        groupElement.id = message.data.group_id;
        groupElement.innerHTML = `
                <span class="message-display">
                    <img class="avatar" src="https://p.qlogo.cn/gh/${message.data.group_id}/${message.data.group_id}/100" alt="avatar" >
                    <div class="username">${message.data.group_name}</div>
                    <div class="message-">${chatlist[message.data.group_id].last_message}</div>
                    <span class="message-time">${chatlist[message.data.group_id].send_time}</span>
                    <span class="message-count">${chatlist[message.data.group_id].unread_count}</span>
                </span>
            `;
        chatListContainer.appendChild(groupElement);
        
        return;
    }
    // 更新全局消息集
    let group_id = message.group_id;
    if (!message_list[group_id]) {
        message_list[group_id] = [];
    }
    message_list[group_id].push({
        text: message.message,
        username: message.sender.card || message.sender.nickname,
        level: message.sender.role + " | 点击开合",
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=' + message.user_id + '&s=640',
        raw_json: message
    });

    // 更新chatlist
    if (!chatlist[group_id]) {
        // 此处是一个新的群，需要获取群信息
        // 初始化chatitem
        chatlist[group_id] = {};

        chatlist[group_id].last_message = (message.sender.card || message.sender.nickname) + ": " + message.raw_message;// TODO: 适配消息
        chatlist[group_id].unread_count = 1; //新消息还没有读
        chatlist[group_id].send_time = getCurrentTime();
        // 发送WS请求获取群信息
        websocket.send(JSON.stringify({
            action: "get_group_info",
            params: {
                group_id: group_id,
                no_cache: true
            }
        }));
        // 稍后需要适配收到消息的逻辑
    }
    else{
        // 已经有消息了
        chatlist[group_id].last_message = (message.sender.card || message.sender.nickname) + ": " + message.raw_message;// TODO: 适配消息
        chatlist[group_id].unread_count++; //新消息还没有读
        chatlist[group_id].send_time = getCurrentTime();


        document.getElementById(group_id).getElementsByClassName('message-')[0].innerText = chatlist[group_id].last_message;
        document.getElementById(group_id).getElementsByClassName('message-time')[0].innerText = chatlist[group_id].send_time;
        document.getElementById(group_id).getElementsByClassName('message-count')[0].innerText = chatlist[group_id].unread_count
    }

    displayMessage({
        text: message.message,
        username: message.sender.card || message.sender.nickname,
        level: message.sender.role + " | 点击开合",
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=' + message.user_id + '&s=640',
    });
};

websocket.onerror = function(error) {
    console.error('WebSocket错误:', error);
};

websocket.onclose = function() {
    console.log('WebSocket连接已关闭');
};

async function sendMessage() {
    const inputField = document.getElementById('message');
    const message = inputField.value;

    if (message) {
        const password = 'your-custom-password'; // 自定义密码
        const encryptedMessage = await encrypt(message, password);
        sendToApi(0, encryptedMessage + "\n解密消息：" + await decrypt(encryptedMessage, password));
    }
}
function sendToApi(group_id, message) {
    fetch('http://127.0.0.1:1145/send_group_msg', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_id: group_id, message: message }),
    })
    .then(response => response.json())
    .then(data => console.log('API响应:', data))
    .catch(error => console.error('API错误:', error));
}


function displayMessage(message) {
    const messagesContainer = document.getElementsByClassName('messages')[0];
    if (messagesContainer) {
        let message_html = ""
        for (let i = 0; i < message.text.length; i++) {
            if (message.text[i].type == "text") {
                message_html += message.text[i].data.text
            }
            if (message.text[i].type == "image") {
                message_html += `<img id="group-image" src=${message.text[i].data.url}>`
            }
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message-item';
        messageElement.innerHTML = `
            <img class="avatar" src="${message.avatar}" alt="avatar" width="24" height="24">
            <span class="username">${message.username}<span class="level">${message.level}</span></span>
            <div class="message-text">${message_html}</div>
        `;
        messagesContainer.appendChild(messageElement);
    } else {
        console.error('无法找到 messages 容器');
    }
}

document.getElementById('sendButton').addEventListener('click', sendMessage);
document.addEventListener('DOMContentLoaded', function() {
    const connectStatus = document.querySelector('.connect-status');
    const statusBar = document.querySelector('.status-bar');

    connectStatus.addEventListener('mouseenter', function() {
        statusBar.style.display = 'block';
    });

    connectStatus.addEventListener('mouseleave', function() {
        statusBar.style.display = 'none';
    });
});