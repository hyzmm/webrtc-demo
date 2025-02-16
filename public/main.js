const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');

let localStream;
let remoteStream;
let peerConnection;
let ws;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // 免费的 STUN 服务器
    ],
};

// 初始化 WebSocket 连接
function initWebSocket() {
    ws = new WebSocket('ws://localhost:8080');

    ws.onmessage = async (message) => {
        const data = JSON.parse(message.data);

        if (data.type === 'offer') {
            // 收到对方的 offer，创建 answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            ws.send(JSON.stringify(answer));
        } else if (data.type === 'answer') {
            // 收到对方的 answer，设置远程描述
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === 'candidate') {
            // 添加 ICE 候选者
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };
}

// 启动呼叫
startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    hangupButton.disabled = false;

    // 获取本地媒体流
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    // 创建 RTCPeerConnection
    peerConnection = new RTCPeerConnection(configuration);

    // 添加本地流到 peerConnection
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    // 监听远程流
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    // 监听 ICE 候选者
    peerConnection.onicecandidate = (event) => {
        console.log(event);
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    // 创建 offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log(offer);

    ws.send(JSON.stringify(offer));
});

// 挂断通话
hangupButton.addEventListener('click', () => {
    peerConnection.close();
    localStream.getTracks().forEach((track) => track.stop());
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    hangupButton.disabled = true;
});

// 初始化 WebSocket
initWebSocket();
