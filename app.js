
// IndexedDB 設定
const dbName = "13CardsDB";
let db;
let dealerIndex = 0; // 當前發牌者的索引

document.addEventListener("DOMContentLoaded", () => {
    let request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
        let db = event.target.result;
        if (!db.objectStoreNames.contains("players")) {
            db.createObjectStore("players", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("scores")) {
            db.createObjectStore("scores", { autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadPlayers();
        loadHistory();
        updateDealer(); // 初始化發牌者
    };
});

function addPlayer() {
    let name = document.getElementById("playerName").value.trim();
    if (name === "") return;

    let transaction = db.transaction(["players"], "readwrite");
    let store = transaction.objectStore("players");
    store.add({ name: name });

    document.getElementById("playerName").value = "";
    loadPlayers();
}

function loadPlayers() {
    let transaction = db.transaction(["players"], "readonly");
    let store = transaction.objectStore("players");
    let request = store.getAll();

    request.onsuccess = (event) => {
        let players = event.target.result;
        let list = document.getElementById("playerList");
        let select = document.getElementById("selectPlayer");
        let filterSelect = document.getElementById("filterPlayer");

        list.innerHTML = "";
        select.innerHTML = "";
        filterSelect.innerHTML = '<option value="">所有玩家</option>';

        players.forEach(player => {
            let li = document.createElement("li");
            li.textContent = player.name;
            list.appendChild(li);

            let option = document.createElement("option");
            option.value = player.name;
            option.textContent = player.name;
            select.appendChild(option);

            let filterOption = document.createElement("option");
            filterOption.value = player.name;
            filterOption.textContent = player.name;
            filterSelect.appendChild(filterOption);
        });

        updateDealer();
    };
}

function addScore() {
    let player = document.getElementById("selectPlayer").value;
    let score = parseInt(document.getElementById("score").value);

    if (player === "" || isNaN(score)) return;

    let transaction = db.transaction(["scores"], "readwrite");
    let store = transaction.objectStore("scores");
    store.add({ player: player, score: score, date: new Date().toISOString() });

    document.getElementById("score").value = "";
    loadHistory();
    updateDealer(); // 更新發牌者
}

// 更新發牌者
function updateDealer() {
    let transaction = db.transaction(["players"], "readonly");
    let store = transaction.objectStore("players");
    let request = store.getAll();

    request.onsuccess = (event) => {
        let players = event.target.result;
        if (players.length > 0) {
            dealerIndex = (dealerIndex + 1) % players.length;
            let nextDealer = players[dealerIndex].name;
            document.getElementById("dealerIndicator").textContent = `下一位發牌者: ${nextDealer}`;
        } else {
            document.getElementById("dealerIndicator").textContent = "沒有玩家，請先新增玩家！";
        }
    };
}

// 撤銷最後一筆記錄（Undo 功能）
function undoLastEntry() {
    let transaction = db.transaction(["scores"], "readwrite");
    let store = transaction.objectStore("scores");

    let request = store.getAll();
    request.onsuccess = (event) => {
        let scores = event.target.result;
        if (scores.length > 0) {
            let lastKey = scores[scores.length - 1].id;
            store.delete(lastKey);
            loadHistory();
        }
    };
}

function loadHistory() {
    let transaction = db.transaction(["scores"], "readonly");
    let store = transaction.objectStore("scores");
    let request = store.getAll();

    request.onsuccess = (event) => {
        let scores = event.target.result;
        let historyList = document.getElementById("history");
        historyList.innerHTML = "";

        let filterPlayer = document.getElementById("filterPlayer").value;
        let filterDate = document.getElementById("filterDate").value;
        let totalScore = 0;
        let playerScores = {};

        scores.forEach(entry => {
            let entryDate = new Date(entry.date).toISOString().split("T")[0];

            if ((filterPlayer === "" || entry.player === filterPlayer) &&
                (filterDate === "" || entryDate === filterDate)) {
                
                let li = document.createElement("li");
                li.textContent = `${new Date(entry.date).toLocaleString()} - ${entry.player}: ${entry.score} 注`;
                historyList.appendChild(li);

                totalScore += entry.score;

                if (!playerScores[entry.player]) {
                    playerScores[entry.player] = 0;
                }
                playerScores[entry.player] += entry.score;
            }
        });

        document.getElementById("totalScore").textContent = `總計: ${totalScore} 注`;

        // 檢查注數是否平衡
        let sum = Object.values(playerScores).reduce((a, b) => a + b, 0);
        if (sum !== 0) {
            document.getElementById("balanceWarning").textContent = "⚠️ 注數不平衡！請檢查數據";
        } else {
            document.getElementById("balanceWarning").textContent = "";
        }
    };
}

// 監聽篩選條件變化
document.getElementById("filterPlayer").addEventListener("change", loadHistory);
document.getElementById("filterDate").addEventListener("change", loadHistory);
