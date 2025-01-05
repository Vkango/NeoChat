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
let self_id = 0;
ProcessSelfInfo();
// 获取自身信息
async function ProcessSelfInfo(){
    try {
        const message = await Api.GetSelfInfo();
        self_id = message.data.user_id;
        document.getElementById('self-avatar1').src = 'https://q1.qlogo.cn/g?b=qq&nk=' + self_id + '&s=640';
    }
    catch (error) {
        console.error('获取自身信息失败:', error);
    };
}

function ProcessNewMessage(event) {
    const message = JSON.parse(event.data);
    // 自己是谁？

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
        user_id: message.user_id,
        id: message.real_id,
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
            user_id: message.user_id,
            id: message.real_id,
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
        try {
            await Api.SendGroupMessageHTTP(currentGroupId, message);
        }
        catch (error) {
            console.error('获取自身信息失败:', error);
        };

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


            else if (message.text[i].type == "image") {
                message_html += `<img id="group-image" src=${message.text[i].data.url} referrerpolicy="no-referrer">`
            }


            else if (message.text[i].type == "face") {
                message_html += `<img src="./src/faces/${message.text[i].data.id}.png" width="24px" referrerpolicy="no-referrer">`
            }


            else if (message.text[i].type == "json") {
                let json_card_info = JSON.parse(message.text[i].data.data);
                message_html += `    <div class="json-card">
        <img src="${json_card_info.meta.detail_1.icon}" width="16px">
        <span class="json-card-app-name">${json_card_info.meta.detail_1.title}</span>
        <div class="json-card-desc">${json_card_info.meta.detail_1.desc}</div>
        <img class="json-card-preview" src="https://${json_card_info.meta.detail_1.preview}" referrerpolicy="no-referrer" width="250px">
    </div>`;
            }

            else if (message.text[i].type == "file") {
                message_html += `    <div class="json-card">
        <span class="json-card-app-name">此文件以保存到晶格内网。</span>
        <div>${message.text[i].data.file}<br><br>${Helper.DisplayFileSize(parseInt(message.text[i].data.file_size))}</div>
        <img class="json-card-preview" src="" referrerpolicy="no-referrer" width="250px">
    </div>`;
            }

            else if (message.text[i].type == 'reply'){
                // 回复消息只支持引用部分的text，image，face以及json/forward的消息提示
                console.log("reply mesg");
                message_html += `<div class="replybox">`;
                let quoteMsg = GetMessage (message.text[i].data.id);
                message_html += `<div>
                <img src="${quoteMsg.avatar}" alt="avatar" style="width: 16px; height: 16px; border-radius: 16px;">`;
                message_html += `<span style="padding-left: 10px; font-size: 14px; position: relative; top: -3px">${quoteMsg.username}</span>
                </div>`;
                for (let i = 0; i < quoteMsg.text.length; i++) {
                    if (quoteMsg.text[i].type == "text") {
                        message_html += quoteMsg.text[i].data.text
                    }
                    else if (quoteMsg.text[i].type == "image") {
                        message_html += `<img id="group-image" src=${quoteMsg.text[i].data.url} referrerpolicy="no-referrer">`
                    }
                    else if (quoteMsg.text[i].type == "face") {
                        message_html += `<img src="./src/faces/${quoteMsg.text[i].data.id}.png" width="24px" referrerpolicy="no-referrer">`
                    }
                    else if (quoteMsg.text[i].type == "json") {
                        message_html += "[JSON卡片]";
                    }
                    else if (quoteMsg.text[i].type == "forward"){
                        message_html += "[合并转发] 聊天记录";
                    }
                    else if (quoteMsg.text[i].type == "file"){
                        message_html += "[文件] " + quoteMsg.text[i].data.file;
                    }
                    else
                    {
                        message_html += quoteMsg.text[i].type;
                    }
                    
                };
                message_html += `</div>`;
            };


            if (message.text[i].type == 'forward') {
                let forward_info = message.text[i].data.content;
                let message_content = "";
                for (let i = 0; i < 4 && i < forward_info.length; i++) {
                    if (!('sender' in forward_info[i])) {
                        forward_info[i].sender = { card: "User" };
                    }
                    message_content += `<div class="single-line" style="max-width: 200px; opacity: 0.8"; padding: 5px 10px; padding-left: 20px>` + (forward_info[i].sender.card || forward_info[i].sender.nickname || "User") + ": " + forward_info[i].raw_message + "\n" + `</div>`;
                }
                message_html += `
                    <div class="forward-card">
                        <span class="json-card-app-name">合并转发 | ${forward_info[0].message_type}</span>
                        <div class="json-card-desc">${message_content}<div style="opacity: 0.5; margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 5px">查看 ${forward_info.length} 条转发消息</div></div>
                    </div>`;
            }



    };
    
    const messageElement = document.createElement('div');
    console.log('displaymsg', message.user_id, self_id);
    messageElement.className = (message.user_id == self_id) ? 'message-item-self' : 'message-item';
    messageElement.innerHTML = 
    messageElement.innerHTML = (message.user_id == self_id) ? `
    <img class="avatar" src="${message.avatar}" width="24" height="24">
    <span class="level">${message.level}</span><span class="username">${message.username}</span>
    <div class="message-text">${message_html}</div>` : `
    <img class="avatar" src="${message.avatar}" width="24" height="24">
    <span class="username">${message.username}<span class="level">${message.level}</span></span>
    <div class="message-text">${message_html}</div>`
    messagesContainer.appendChild(messageElement);
    if (isScrolledToBottom) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    }
    else {
        console.error('无法找到 messages 容器');
    }
}
function GetMessage (id){
    const messages = message_list[currentGroupId] || [];
    for (let i = 0; i < messages.length; i++){
        if (messages[i].id == id){
            return messages[i];
        }
    }
    return {text: [{type: 'text', data: {text: '引用消息不存在'}}]};
    // current group
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