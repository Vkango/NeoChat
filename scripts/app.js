// 管理消息收发
import { decrypt, encrypt } from './crypto.js';
import { WSMessage } from './ws.js';
import * as Helper from './helper.js';
import { API } from './api.js';
const message_list = {}; // 用于保存消息的对象，以群号区分
const chatlist = {}; // 用于管理消息列表
let websocket = new WSMessage('ws://127.0.0.1:1148', ProcessNewMessage)
let Api = new API('http://127.0.0.1:1145', websocket);
let currentGroupId = 0;
function ProcessNewMessage(event) {
    const message = JSON.parse(event.data);
    let group_id = message.group_id;
    ////////////////////////////////////////////////////////////
    // 获取群信息WS消息到来
    if (message.data && 'group_name' in message.data){
        // WS响应获取群信息
        chatlist[message.data.group_id].name = message.data.group_name;
        // 更新DOM
        const chatListContainer = document.getElementsByClassName('chat-items')[0];
        const groupElement = document.createElement('div');
        groupElement.className = 'chat-item';
        groupElement.id = message.data.group_id;
        groupElement.style.order = 0;
        groupElement.innerHTML = `
                <span class="message-display">
                    <img class="avatar" src="https://p.qlogo.cn/gh/${message.data.group_id}/${message.data.group_id}/100" alt="avatar" >
                    <div class="username">${message.data.group_name}</div>
                    <div class="message-">${chatlist[message.data.group_id].last_message}</div>
                    <span class="message-time">${chatlist[message.data.group_id].send_time}</span>
                    <span class="message-count">${chatlist[message.data.group_id].unread_count}</span>
                </span>
            `;
        groupElement.addEventListener('click', () => switchChat(message.data.group_id));
        chatListContainer.appendChild(groupElement);
        ReorderChatList(group_id);
        return;
    }

    ////////////////////////////////////////////////////////////
    // 更新全局消息集

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

    ////////////////////////////////////////////////////////////
    // 更新对话列表
    if (!chatlist[group_id]) {
        // 此处是一个新的群，需要获取群信息
        // 初始化chatitem
        chatlist[group_id] = {};
        chatlist[group_id].last_message = (message.sender.card || message.sender.nickname) + ": " + message.raw_message;// TODO: 适配消息
        chatlist[group_id].unread_count = 1; //新消息还没有读
        chatlist[group_id].send_time = Helper.getCurrentTime();
        // 发送WS请求获取群信息
        Api.GetGroupInfo(group_id);
        // 稍后需要适配收到消息的逻辑
    }
    else{
        // 已经有消息了
        chatlist[group_id].last_message = (message.sender.card || message.sender.nickname) + ": " + message.raw_message;// TODO: 适配消息
        
        chatlist[group_id].send_time = Helper.getCurrentTime();
        document.getElementById(group_id).style.order = 0;
        document.getElementById(group_id).getElementsByClassName('message-')[0].innerText = chatlist[group_id].last_message;
        document.getElementById(group_id).getElementsByClassName('message-time')[0].innerText = chatlist[group_id].send_time;
        if (group_id != currentGroupId) {
            chatlist[group_id].unread_count++; //新消息还没有读
            document.getElementById(group_id).getElementsByClassName('message-count')[0].style = 'display:block';
            document.getElementById(group_id).getElementsByClassName('message-count')[0].innerText = chatlist[group_id].unread_count;
        }
        
        ReorderChatList();
    }
    if (group_id == currentGroupId){
        displayMessage({
            text: message.message,
            username: message.sender.card || message.sender.nickname,
            level: message.sender.role + " | 点击开合",
            avatar: 'https://q1.qlogo.cn/g?b=qq&nk=' + message.user_id + '&s=640',
        })
};
};
function switchChat(group_id) {
    if (currentGroupId != 0) {document.getElementById(currentGroupId).style.backgroundColor = 'rgba(0, 102, 204, 0)';}
    chatlist[group_id].unread_count = 0;
    document.getElementById(group_id).getElementsByClassName('message-count')[0].style = 'display:none';
    currentGroupId = group_id;
    document.getElementsByClassName('group-name')[0].innerText = chatlist[group_id].name;
    document.getElementById(group_id).style.backgroundColor = 'rgba(0, 102, 204, 0.4)';
    const messagesContainer = document.getElementsByClassName('messages')[0];
    messagesContainer.innerHTML = '';
    const messages = message_list[group_id] || [];
    console.log("此群消息：", messages, message_list, group_id);
    messages.forEach(message => {
        displayMessage(message);
    });
}

function ReorderChatList(currentGroupId) {
    const chatItems = document.getElementsByClassName('chat-item');
    for (let i = 0; i < chatItems.length; i++) {
        const chatItem = chatItems[i];
        if (chatItem.id === currentGroupId) {
            chatItem.style.order = 0;
        } else {
            chatItem.style.order = parseInt(chatItem.style.order) + 1 || 1;
        }
    }
}

async function sendMessage() {
    const inputField = document.getElementById('message');
    const message = inputField.value;
    if (message) {
        const password = 'your-custom-password'; // 自定义密码
        const encryptedMessage = await encrypt(message, password);
        sendToApi(0, encryptedMessage + "\n解密消息：" + await decrypt(encryptedMessage, password));
    }
}

function displayMessage(message) {
    const messagesContainer = document.getElementsByClassName('messages')[0];
    if (messagesContainer) {
        const isScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 1;
        let message_html = ""
        for (let i = 0; i < message.text.length; i++) {
            if (message.text[i].type == "text") {
                message_html += message.text[i].data.text
            }
            if (message.text[i].type == "image") {
                message_html += `<img id="group-image" src=${message.text[i].data.url} referrerpolicy="no-referrer">`
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
        if (isScrolledToBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
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