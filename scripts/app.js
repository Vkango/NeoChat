import { decrypt, encrypt } from './crypto.js';

const websocket = new WebSocket('ws://127.0.0.1:1148');

websocket.onopen = function() {
    console.log('WebSocket连接已建立');
};

websocket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    displayMessage({
        text: message.message,
        username: message.sender.card || message.sender.nickname,
        level: message.sender.role + " | 点击开合",
        avatar: 'https://q1.qlogo.cn/g?b=qq&nk=' + message.user_id + '&s=640'
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