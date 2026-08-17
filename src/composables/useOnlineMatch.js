import { ref, reactive, computed } from "vue";
import { Peer } from "peerjs";

const PEER_PREFIX = "xiangqi-p2p-v1-";

export function useOnlineMatch() {
  const peer = ref(null);
  const conn = ref(null);

  const roomId = ref("");
  const isHost = ref(false); // Host is Red (先手), Guest is Black (后手)
  const onlineStatus = ref("disconnected"); // 'disconnected' | 'creating' | 'waiting' | 'joining' | 'connected' | 'error'
  const errorMessage = ref("");

  const myNickname = ref(
    localStorage.getItem("xiangqi_nickname") || "大内高手"
  );
  const opponentNickname = ref("等待对手加入...");
  const opponentEmoji = ref(null);
  let emojiTimeout = null;

  // Listeners
  const listeners = reactive({
    onMove: null,
    onUndoReq: null,
    onUndoAccept: null,
    onUndoReject: null,
    onRestartReq: null,
    onRestartAccept: null,
    onResign: null,
    onConnected: null,
    onDisconnected: null,
  });

  const isConnected = computed(() => onlineStatus.value === "connected");

  const setNickname = (name) => {
    myNickname.value = name || "棋友";
    try {
      localStorage.setItem("xiangqi_nickname", myNickname.value);
    } catch (e) {}
    if (conn.value && isConnected.value) {
      conn.value.send({
        type: "NICKNAME_UPDATE",
        nickname: myNickname.value,
      });
    }
  };

  const getIceConfig = () => ({
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    },
  });

  // Setup connection event handlers
  const setupConnection = (connection) => {
    conn.value = connection;

    conn.value.on("open", () => {
      onlineStatus.value = "connected";
      errorMessage.value = "";

      // Send initial handshake with nickname
      conn.value.send({
        type: "HANDSHAKE",
        nickname: myNickname.value,
        isHost: isHost.value,
      });

      if (listeners.onConnected) {
        listeners.onConnected({ isHost: isHost.value });
      }
    });

    conn.value.on("data", (data) => {
      handleIncomingData(data);
    });

    conn.value.on("close", () => {
      onlineStatus.value = "disconnected";
      opponentNickname.value = "对手已断开连接";
      if (listeners.onDisconnected) {
        listeners.onDisconnected();
      }
    });

    conn.value.on("error", (err) => {
      console.error("PeerJS connection error:", err);
      errorMessage.value = "连接异常: " + (err.message || err);
      onlineStatus.value = "error";
    });
  };

  const handleIncomingData = (data) => {
    if (!data || !data.type) return;

    switch (data.type) {
      case "HANDSHAKE":
        opponentNickname.value = data.nickname || "神秘对手";
        // Reply with our nickname if we are host and receiving guest handshake
        if (isHost.value) {
          conn.value.send({
            type: "HANDSHAKE_ACK",
            nickname: myNickname.value,
          });
        }
        break;

      case "HANDSHAKE_ACK":
        opponentNickname.value = data.nickname || "神秘对手";
        break;

      case "NICKNAME_UPDATE":
        opponentNickname.value = data.nickname || "神秘对手";
        break;

      case "MOVE":
        if (listeners.onMove && data.move) {
          listeners.onMove(data.move);
        }
        break;

      case "UNDO_REQ":
        if (listeners.onUndoReq) {
          listeners.onUndoReq();
        }
        break;

      case "UNDO_ACCEPT":
        if (listeners.onUndoAccept) {
          listeners.onUndoAccept();
        }
        break;

      case "UNDO_REJECT":
        if (listeners.onUndoReject) {
          listeners.onUndoReject();
        }
        break;

      case "RESTART_REQ":
        if (listeners.onRestartReq) {
          listeners.onRestartReq();
        }
        break;

      case "RESTART_ACCEPT":
        if (listeners.onRestartAccept) {
          listeners.onRestartAccept();
        }
        break;

      case "RESIGN":
        if (listeners.onResign) {
          listeners.onResign();
        }
        break;

      case "EMOJI":
        opponentEmoji.value = data.emoji;
        if (emojiTimeout) clearTimeout(emojiTimeout);
        emojiTimeout = setTimeout(() => {
          opponentEmoji.value = null;
        }, 3000);
        break;
    }
  };

  const cleanup = () => {
    if (conn.value) {
      try {
        conn.value.close();
      } catch (e) {}
      conn.value = null;
    }
    if (peer.value) {
      try {
        peer.value.destroy();
      } catch (e) {}
      peer.value = null;
    }
    onlineStatus.value = "disconnected";
  };

  // Create Room as Host (Red Player)
  const createRoom = (customCode = "") => {
    cleanup();
    const code =
      customCode ||
      Math.floor(100000 + Math.random() * 900000).toString();
    roomId.value = code;
    isHost.value = true;
    onlineStatus.value = "creating";
    errorMessage.value = "";
    opponentNickname.value = "等待对手加入...";

    const fullPeerId = `${PEER_PREFIX}${code}`;
    const p = new Peer(fullPeerId, getIceConfig());
    peer.value = p;

    p.on("open", () => {
      onlineStatus.value = "waiting";
    });

    p.on("connection", (c) => {
      setupConnection(c);
    });

    p.on("error", (err) => {
      console.error("Peer host error:", err);
      if (err.type === "unavailable-id") {
        // Retry with new code if collision
        createRoom();
      } else {
        errorMessage.value = "创建房间失败: " + (err.message || err.type);
        onlineStatus.value = "error";
      }
    });
  };

  // Join Room as Guest (Black Player)
  const joinRoom = (code) => {
    if (!code) return;
    cleanup();
    const cleanCode = code.trim();
    roomId.value = cleanCode;
    isHost.value = false;
    onlineStatus.value = "joining";
    errorMessage.value = "";
    opponentNickname.value = "正在连接房主...";

    const p = new Peer(getIceConfig());
    peer.value = p;

    p.on("open", () => {
      const targetPeerId = `${PEER_PREFIX}${cleanCode}`;
      const c = p.connect(targetPeerId, { reliable: true });
      setupConnection(c);
    });

    p.on("error", (err) => {
      console.error("Peer join error:", err);
      errorMessage.value = "加入房间失败: 房间不存在或网络异常";
      onlineStatus.value = "error";
    });
  };

  // Action methods
  const sendMove = (move) => {
    if (conn.value && isConnected.value) {
      conn.value.send({
        type: "MOVE",
        move: {
          fromR: move.fromR,
          fromC: move.fromC,
          toR: move.toR,
          toC: move.toC,
        },
      });
    }
  };

  const sendEmoji = (emoji) => {
    if (conn.value && isConnected.value) {
      conn.value.send({ type: "EMOJI", emoji });
    }
  };

  const requestUndo = () => {
    if (conn.value && isConnected.value) {
      conn.value.send({ type: "UNDO_REQ" });
    }
  };

  const respondUndo = (accept) => {
    if (conn.value && isConnected.value) {
      conn.value.send({ type: accept ? "UNDO_ACCEPT" : "UNDO_REJECT" });
    }
  };

  const requestRestart = () => {
    if (conn.value && isConnected.value) {
      conn.value.send({ type: "RESTART_REQ" });
    }
  };

  const respondRestart = (accept) => {
    if (conn.value && isConnected.value) {
      conn.value.send({ type: accept ? "RESTART_ACCEPT" : "RESTART_REJECT" });
    }
  };

  const sendResign = () => {
    if (conn.value && isConnected.value) {
      conn.value.send({ type: "RESIGN" });
    }
  };

  return {
    roomId,
    isHost,
    onlineStatus,
    isConnected,
    errorMessage,
    myNickname,
    opponentNickname,
    opponentEmoji,
    listeners,
    setNickname,
    createRoom,
    joinRoom,
    sendMove,
    sendEmoji,
    requestUndo,
    respondUndo,
    requestRestart,
    respondRestart,
    sendResign,
    leaveRoom: cleanup,
  };
}
